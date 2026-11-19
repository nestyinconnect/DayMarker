import { NextResponse } from "next/server"

import { readSheetInfo } from "@/lib/google-sheets"

export async function GET() {
  try {
    return NextResponse.json(await readSheetInfo())
  } catch (error) {
    console.error("Unable to read sheet details", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read Google Sheet details." },
      { status: 503 },
    )
  }
}
