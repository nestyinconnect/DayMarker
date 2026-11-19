import type { PlannerData } from "@/components/planner-types"

const SHEET_NAME = "Records"
const VALID_KINDS = ["expense", "deposit", "task", "goal", "reminder", "event", "feedback", "settings"] as const
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

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const DRIVE_METADATA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly"

async function getAccessToken(account: ServiceAccount, scope = SHEETS_SCOPE) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const unsignedToken = [
    encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    encodeBase64Url(JSON.stringify({
      iss: account.client_email,
      scope,
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

function getRecordCollection(data: PlannerData, kind: Exclude<RecordKind, "settings">) {
  const collectionByKind = {
    expense: data.expenses,
    deposit: data.deposits,
    task: data.tasks,
    goal: data.goals,
    reminder: data.reminders,
    event: data.events,
    feedback: data.feedback,
  }
  return collectionByKind[kind]
}

export async function readPlannerData(): Promise<PlannerData> {
  const { sheetId, token } = await connectToSheet()
  const result = await googleRequest<{ values?: string[][] }>(
    `${sheetId}/values/${SHEET_NAME}!A2:C`,
    token,
  )
  const data: PlannerData = { expenses: [], deposits: [], tasks: [], goals: [], reminders: [], events: [], feedback: [] }

  for (const [kind, , payload] of result.values ?? []) {
    if (!VALID_KINDS.includes(kind as RecordKind) || !payload) continue
    try {
      const item = JSON.parse(payload) as { id?: string; names?: unknown }
      if (!item.id) continue
      if (kind === "settings") {
        const names = Array.isArray(item.names) && item.names.every((name) => typeof name === "string") ? item.names : null
        if (names && item.id === "categories") data.categories = names
        if (names && item.id === "expenseCategories") data.expenseCategories = names
        continue
      }
      getRecordCollection(data, kind as Exclude<RecordKind, "settings">).push(item as never)
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

export async function upsertPlannerRecords(records: { kind: RecordKind; id: string; item: unknown }[]) {
  const { sheetId, token } = await connectToSheet()
  const result = await googleRequest<{ values?: string[][] }>(`${sheetId}/values/${SHEET_NAME}!A2:C`, token)
  const rows = result.values ?? []
  const updates: { range: string; values: string[][] }[] = []
  const appends: string[][] = []
  for (const record of records) {
    const values = [record.kind, record.id, JSON.stringify(record.item)]
    const index = rows.findIndex(([kind, id]) => kind === record.kind && id === record.id)
    if (index < 0) appends.push(values)
    else updates.push({ range: `${SHEET_NAME}!A${index + 2}:C${index + 2}`, values: [values] })
  }
  if (updates.length) {
    await googleRequest(`${sheetId}/values:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
    })
  }
  if (appends.length) {
    await googleRequest(`${sheetId}/values/${SHEET_NAME}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, token, {
      method: "POST",
      body: JSON.stringify({ values: appends }),
    })
  }
}

export interface SheetInfo {
  title: string
  url: string
  spreadsheetId: string
  tabName: string
  tabs: string[]
  locale?: string
  timeZone?: string
  serviceAccountEmail: string
  owners: { name?: string; email?: string }[]
  modifiedTime?: string
  lastModifiedBy?: { name?: string; email?: string }
  driveInfoAvailable: boolean
}

export async function readSheetInfo(): Promise<SheetInfo> {
  const { sheetId, serviceAccount } = getConfiguration()
  const encodedId = encodeURIComponent(sheetId)
  const token = await getAccessToken(serviceAccount)
  const spreadsheet = await googleRequest<{
    spreadsheetUrl?: string
    properties?: { title?: string; locale?: string; timeZone?: string }
    sheets?: { properties?: { title?: string } }[]
  }>(`${encodedId}?fields=spreadsheetUrl,properties(title,locale,timeZone),sheets.properties.title`, token)

  const info: SheetInfo = {
    title: spreadsheet.properties?.title ?? "Untitled spreadsheet",
    url: spreadsheet.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${encodedId}/edit`,
    spreadsheetId: sheetId,
    tabName: SHEET_NAME,
    tabs: (spreadsheet.sheets ?? []).map((sheet) => sheet.properties?.title).filter((title): title is string => Boolean(title)),
    locale: spreadsheet.properties?.locale,
    timeZone: spreadsheet.properties?.timeZone,
    serviceAccountEmail: serviceAccount.client_email,
    owners: [],
    driveInfoAvailable: false,
  }

  // Owner details need the Drive API enabled on the service account's project; skip quietly if not.
  try {
    const driveToken = await getAccessToken(serviceAccount, DRIVE_METADATA_SCOPE)
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodedId}?fields=owners(displayName,emailAddress),modifiedTime,lastModifyingUser(displayName,emailAddress)&supportsAllDrives=true`,
      { headers: { authorization: `Bearer ${driveToken}` } },
    )
    if (response.ok) {
      const file = await response.json() as {
        owners?: { displayName?: string; emailAddress?: string }[]
        modifiedTime?: string
        lastModifyingUser?: { displayName?: string; emailAddress?: string }
      }
      info.owners = (file.owners ?? []).map((owner) => ({ name: owner.displayName, email: owner.emailAddress }))
      info.modifiedTime = file.modifiedTime
      if (file.lastModifyingUser) info.lastModifiedBy = { name: file.lastModifyingUser.displayName, email: file.lastModifyingUser.emailAddress }
      info.driveInfoAvailable = true
    } else {
      console.warn("Drive metadata unavailable", response.status)
    }
  } catch (error) {
    console.warn("Drive metadata unavailable", error)
  }

  return info
}

export function isRecordKind(value: unknown): value is RecordKind {
  return typeof value === "string" && VALID_KINDS.includes(value as RecordKind)
}