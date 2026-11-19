import { NextResponse } from "next/server"

import { appendPlannerRecords, isRecordKind, readPlannerData, upsertPlannerRecords, writePlannerRecord } from "@/lib/google-sheets"

const MAX_APPEND_ITEMS = 400
const MAX_UPSERT_RECORDS = 2000

export async function GET() {
  try {
    return NextResponse.json(await readPlannerData())
  } catch (error) {
    console.error("Unable to read planner data", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read planner data." },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  let input: {
    kind?: unknown
    id?: unknown
    item?: unknown
    items?: unknown
    records?: unknown
    operation?: unknown
  }
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  if (input.operation === "upsertMany") {
    const records = input.records
    if (
      !Array.isArray(records) ||
      !records.length ||
      records.length > MAX_UPSERT_RECORDS ||
      !records.every((record) => record && typeof record === "object" && isRecordKind(record.kind) &&
        typeof record.id === "string" && record.id && record.item && typeof record.item === "object")
    ) {
      return NextResponse.json({ error: "Invalid planner records." }, { status: 400 })
    }
    try {
      await upsertPlannerRecords(records)
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error("Unable to update planner records", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to save planner data." },
        { status: 503 },
      )
    }
  }

  if (input.operation === "append") {
    const items = input.items
    if (
      !isRecordKind(input.kind) ||
      !Array.isArray(items) ||
      !items.length ||
      items.length > MAX_APPEND_ITEMS ||
      !items.every((item) => item && typeof item === "object" && typeof item.id === "string" && item.id)
    ) {
      return NextResponse.json({ error: "Invalid planner records." }, { status: 400 })
    }
    try {
      await appendPlannerRecords(input.kind, items as { id: string }[])
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error("Unable to append planner records", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to save planner data." },
        { status: 503 },
      )
    }
  }

  if (
    !isRecordKind(input.kind) ||
    typeof input.id !== "string" ||
    !input.id ||
    (input.operation !== "upsert" && input.operation !== "delete") ||
    (input.operation === "upsert" && (!input.item || typeof input.item !== "object"))
  ) {
    return NextResponse.json({ error: "Invalid planner record." }, { status: 400 })
  }

  try {
    await writePlannerRecord({
      kind: input.kind,
      id: input.id,
      item: input.item,
      operation: input.operation,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Unable to write planner record", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save planner data." },
      { status: 503 },
    )
  }
}