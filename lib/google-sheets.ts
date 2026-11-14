import type { PlannerData } from "@/components/planner-types"

const SHEET_NAME = "Records"
const VALID_KINDS = ["expense", "deposit", "task", "goal", "reminder", "event"] as const
type RecordKind = typeof VALID_KINDS[number]

type ServiceAccount = {
  client_email: string
  private_key: string
}

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function decodePem(value: string) {
  const base64 = value.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function getAccessToken(account: ServiceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const unsignedToken = [
    encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    encodeBase64Url(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    })),
  ].join(".")
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    decodePem(account.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken),
  )
  const assertion = `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })
  if (!response.ok) throw new Error("Google authentication failed")
  const tokenResult = await response.json() as { access_token?: string }
  if (!tokenResult.access_token) throw new Error("Google did not return an access token")
  return tokenResult.access_token
}

function getConfiguration() {
  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!sheetId) throw new Error("Google Sheets is not configured. Set GOOGLE_SHEET_ID.")
  if (!serviceAccountJson) throw new Error("Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON to the service-account JSON secret.")
  let serviceAccount: ServiceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.")
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Google service account JSON is missing its email or private key.")
  }
  return { sheetId, serviceAccount }
}

async function googleRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.text()
    console.error("Google Sheets API error", response.status, body)
    throw new Error("Google Sheets request failed")
  }
  return response.json() as Promise<T>
}

async function connectToSheet() {
  const { sheetId, serviceAccount } = getConfiguration()
  const token = await getAccessToken(serviceAccount)
  const encodedId = encodeURIComponent(sheetId)
  const spreadsheet = await googleRequest<{
    sheets?: { properties?: { sheetId?: number; title?: string } }[]
  }>(`${encodedId}?fields=sheets.properties`, token)
  const recordsSheet = spreadsheet.sheets?.find((sheet) => sheet.properties?.title === SHEET_NAME)
  let recordsSheetId = recordsSheet?.properties?.sheetId

  if (!recordsSheet) {
    const createdSheet = await googleRequest<{
      replies?: { addSheet?: { properties?: { sheetId?: number } } }[]
    }>(`${encodedId}:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }),
    })
    recordsSheetId = createdSheet.replies?.[0]?.addSheet?.properties?.sheetId
    await googleRequest(`${encodedId}/values/${SHEET_NAME}!A1:C1?valueInputOption=RAW`, token, {
      method: "PUT",
      body: JSON.stringify({ values: [["kind", "id", "payload"]] }),
    })
  }

  if (recordsSheetId === undefined) throw new Error("Could not identify the Records sheet tab.")
  return { sheetId: encodedId, sheetTabId: recordsSheetId, token }
}

function getRecordCollection(data: PlannerData, kind: RecordKind) {
  const collectionByKind = {
    expense: data.expenses,
    deposit: data.deposits,
    task: data.tasks,
    goal: data.goals,
    reminder: data.reminders,
    event: data.events,
  }
  return collectionByKind[kind]
}

export async function readPlannerData(): Promise<PlannerData> {
  const { sheetId, token } = await connectToSheet()
  const result = await googleRequest<{ values?: string[][] }>(
    `${sheetId}/values/${SHEET_NAME}!A2:C`,
    token,
  )
  const data: PlannerData = { expenses: [], deposits: [], tasks: [], goals: [], reminders: [], events: [] }

  for (const [kind, , payload] of result.values ?? []) {
    if (!VALID_KINDS.includes(kind as RecordKind) || !payload) continue
    try {
      const item = JSON.parse(payload) as { id?: string }
      if (!item.id) continue
      getRecordCollection(data, kind as RecordKind).push(item as never)
    } catch {
      console.warn("Skipping malformed planner row")
    }
  }

  return data
}

export async function writePlannerRecord(input: {
  kind: RecordKind
  id: string
  item?: unknown
  operation: "upsert" | "delete"
}) {
  const { sheetId, sheetTabId, token } = await connectToSheet()
  const range = `${SHEET_NAME}!A2:C`
  const result = await googleRequest<{ values?: string[][] }>(
    `${sheetId}/values/${range}`,
    token,
  )
  const existingIndex = (result.values ?? []).findIndex(([kind, id]) => kind === input.kind && id === input.id)

  if (input.operation === "delete") {
    if (existingIndex < 0) return
    const rowNumber = existingIndex + 2
    await googleRequest(
      `${sheetId}/values/${SHEET_NAME}!A${rowNumber}:C${rowNumber}:clear`,
      token,
      {
      method: "POST",
        body: JSON.stringify({}),
      },
    )
    return
  }

  const values = [[input.kind, input.id, JSON.stringify(input.item)]]
  if (existingIndex < 0) {
    await googleRequest(`${sheetId}/values/${SHEET_NAME}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, token, {
      method: "POST",
      body: JSON.stringify({ values }),
    })
    return
  }

  const rowNumber = existingIndex + 2
  await googleRequest(
    `${sheetId}/values/${SHEET_NAME}!A${rowNumber}:C${rowNumber}?valueInputOption=RAW`,
    token,
    { method: "PUT", body: JSON.stringify({ values }) },
  )
}

export async function appendPlannerRecords(kind: RecordKind, items: { id: string }[]) {
  const { sheetId, token } = await connectToSheet()
  const values = items.map((item) => [kind, item.id, JSON.stringify(item)])
  await googleRequest(`${sheetId}/values/${SHEET_NAME}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, token, {
    method: "POST",
    body: JSON.stringify({ values }),
  })
}

export function isRecordKind(value: unknown): value is RecordKind {
  return typeof value === "string" && VALID_KINDS.includes(value as RecordKind)
}