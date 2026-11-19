import { useEffect, useState, type ReactNode } from "react"
import { Copy, ExternalLink, FileSpreadsheet, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionHeader } from "@/components/planner-shared"
import type { PlannerData } from "@/components/planner-types"
import type { SheetInfo } from "@/lib/google-sheets"

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-muted-foreground"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      <Copy aria-hidden="true" />
    </Button>
  )
}

function DetailRow({ label, children, copy }: { label: string; children: ReactNode; copy?: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-sm">
        <span className="min-w-0 flex-1 break-all">{children}</span>
        {copy ? <CopyButton value={copy} label={label.toLowerCase()} /> : null}
      </dd>
    </div>
  )
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function PlannerSheetInfo({ data }: { data: PlannerData }) {
  const [info, setInfo] = useState<SheetInfo | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch("/api/sheet")
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Unable to read Google Sheet details.")
        return result as SheetInfo
      })
      .then((result) => { if (active) { setInfo(result); setError("") } })
      .catch((fetchError: unknown) => { if (active) setError(fetchError instanceof Error ? fetchError.message : "Unable to read Google Sheet details.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  const counts = [
    { label: "Expenses", value: data.expenses.length },
    { label: "Fixed deposits", value: data.deposits.length },
    { label: "Tasks", value: data.tasks.length },
    { label: "Goals", value: data.goals.length },
    { label: "Events", value: data.events.length },
    { label: "Reminders", value: data.reminders.length },
    { label: "Feedback", value: data.feedback.length },
  ]

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Where your data lives"
        description="Details of the Google Sheet this planner reads from and writes to."
        action={
          <Button variant="outline" disabled={loading} onClick={() => setReloadKey((key) => key + 1)}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />Refresh
          </Button>
        }
      />

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <CardTitle className="truncate">{info?.title ?? (loading ? "Loading…" : "Google Sheet")}</CardTitle>
            <CardDescription className="mt-1">Google Sheets data source</CardDescription>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet aria-hidden="true" className="size-4" />
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {info ? (
            <dl className="divide-y divide-border/70">
              <DetailRow label="Sheet name" copy={info.title}>{info.title}</DetailRow>
              <DetailRow label="Link" copy={info.url}>
                <a href={info.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                  Open in Google Sheets<ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </DetailRow>
              <DetailRow label="Spreadsheet ID" copy={info.spreadsheetId}><code className="text-xs">{info.spreadsheetId}</code></DetailRow>
              <DetailRow label="Data tab">
                <span className="flex flex-wrap items-center gap-1.5">
                  {info.tabs.length ? info.tabs.map((tab) => (
                    <Badge key={tab} variant={tab === info.tabName ? "default" : "outline"}>{tab}</Badge>
                  )) : <Badge>{info.tabName}</Badge>}
                </span>
              </DetailRow>
              <DetailRow label="Owner">
                {info.owners.length
                  ? info.owners.map((owner) => [owner.name, owner.email].filter(Boolean).join(" · ")).join(", ")
                  : <span className="text-muted-foreground">Not available (enable the Google Drive API for the service account&rsquo;s project)</span>}
              </DetailRow>
              <DetailRow label="Connected account" copy={info.serviceAccountEmail}>
                {info.serviceAccountEmail}
                <span className="mt-0.5 block text-xs text-muted-foreground">The sheet must be shared with this address as an Editor.</span>
              </DetailRow>
              {info.modifiedTime ? (
                <DetailRow label="Last modified">
                  {formatTimestamp(info.modifiedTime)}
                  {info.lastModifiedBy ? <span className="text-muted-foreground"> by {info.lastModifiedBy.name ?? info.lastModifiedBy.email}</span> : null}
                </DetailRow>
              ) : null}
              {info.timeZone || info.locale ? (
                <DetailRow label="Time zone / locale">{[info.timeZone, info.locale].filter(Boolean).join(" · ")}</DetailRow>
              ) : null}
            </dl>
          ) : loading ? (
            <p className="py-6 text-sm text-muted-foreground">Reading sheet details…</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Records stored</CardTitle>
          <CardDescription className="mt-1">Rows in the &ldquo;{info?.tabName ?? "Records"}&rdquo; tab, by type.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0 sm:grid-cols-3">
          {counts.map((count) => (
            <div key={count.label} className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{count.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{count.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
