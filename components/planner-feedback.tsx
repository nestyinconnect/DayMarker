import { useState, type FormEvent } from "react"
import { CircleCheck, CircleDot, Loader, MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateShort } from "@/components/planner-data"
import { EmptyState, SectionHeader } from "@/components/planner-shared"
import type { FeedbackItem, FeedbackStatus, FeedbackType, TaskPriority } from "@/components/planner-types"

const TYPES: FeedbackType[] = ["Enhancement", "Bug", "Feedback"]
const STATUS_ITEMS: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
]
const PRIORITY_ITEMS: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
]
const STATUS_FILTER_ITEMS = [{ value: "all", label: "All statuses" }, ...STATUS_ITEMS]
const TYPE_FILTER_ITEMS = [{ value: "all", label: "All types" }, ...TYPES.map((type) => ({ value: type, label: type }))]
const STATUS_ORDER: Record<FeedbackStatus, number> = { "in-progress": 0, open: 1, resolved: 2 }
const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }

function withStatus(item: FeedbackItem, status: FeedbackStatus, today: string): FeedbackItem {
  if (status === item.status) return item
  const { resolvedAt: _resolvedAt, ...rest } = item
  return status === "resolved" ? { ...rest, status, resolvedAt: today } : { ...rest, status }
}

function FeedbackForm({
  item,
  today,
  onSave,
  onCancel,
}: {
  item: FeedbackItem | null
  today: string
  onSave: (item: FeedbackItem) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(item?.title ?? "")
  const [details, setDetails] = useState(item?.details ?? "")
  const [type, setType] = useState<FeedbackType>(item?.type ?? "Enhancement")
  const [priority, setPriority] = useState<TaskPriority>(item?.priority ?? "normal")
  const [status, setStatus] = useState<FeedbackStatus>(item?.status ?? "open")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return setError("Add a short title to continue.")
    const base: FeedbackItem = item
      ? { ...item, title: cleanTitle, details: details.trim(), type, priority }
      : { id: crypto.randomUUID(), title: cleanTitle, details: details.trim(), type, priority, status: "open", createdAt: today }
    setSaving(true)
    setError("")
    try {
      await onSave(withStatus(base, status, today))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4 py-2">
        <Field>
          <FieldLabel htmlFor="feedback-title">Title</FieldLabel>
          <Input id="feedback-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="e.g. Add a dark mode toggle" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="feedback-details">Details</FieldLabel>
          <textarea
            id="feedback-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="What should change, and why?"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </Field>
        <FieldGroup className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="feedback-type">Type</FieldLabel>
            <Select value={type} onValueChange={(value) => { if (TYPES.includes(value as FeedbackType)) setType(value as FeedbackType) }}>
              <SelectTrigger id="feedback-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TYPES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="feedback-priority">Priority</FieldLabel>
            <Select items={PRIORITY_ITEMS} value={priority} onValueChange={(value) => {
              if (value === "low" || value === "normal" || value === "high") setPriority(value)
            }}>
              <SelectTrigger id="feedback-priority" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRIORITY_ITEMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        {item ? (
          <Field>
            <FieldLabel htmlFor="feedback-status">Status</FieldLabel>
            <Select items={STATUS_ITEMS} value={status} onValueChange={(value) => {
              if (STATUS_ITEMS.some((option) => option.value === value)) setStatus(value as FeedbackStatus)
            }}>
              <SelectTrigger id="feedback-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_ITEMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </FieldGroup>
      <DialogFooter className="mt-5">
        <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          <MessageSquarePlus data-icon="inline-start" aria-hidden="true" />
          {saving ? "Saving…" : item ? "Save changes" : "Add item"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PlannerFeedback({
  items,
  today,
  onSave,
  onDelete,
}: {
  items: FeedbackItem[]
  today: string
  onSave: (item: FeedbackItem) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FeedbackItem | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusError, setStatusError] = useState("")

  const visible = items
    .filter((item) => statusFilter === "all" || item.status === statusFilter)
    .filter((item) => typeFilter === "all" || item.type === typeFilter)
    .sort((a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      b.createdAt.localeCompare(a.createdAt))
  const countBy = (status: FeedbackStatus) => items.filter((item) => item.status === status).length

  function openDialog(item: FeedbackItem | null) {
    setEditing(item)
    setDialogOpen(true)
  }

  function changeStatus(item: FeedbackItem, status: FeedbackStatus) {
    setStatusError("")
    onSave(withStatus(item, status, today)).catch((error: unknown) => {
      setStatusError(error instanceof Error ? error.message : "Unable to update status.")
    })
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Make DayMarker better"
        description="Capture enhancement ideas, bugs, and feedback, then track them to resolved."
        action={<Button onClick={() => openDialog(null)}><Plus data-icon="inline-start" aria-hidden="true" />Add item</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open", value: countBy("open"), icon: CircleDot },
          { label: "In progress", value: countBy("in-progress"), icon: Loader },
          { label: "Resolved", value: countBy("resolved"), icon: CircleCheck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>
              <Icon aria-hidden="true" className="size-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Tracker</CardTitle>
            <CardDescription className="mt-1">{visible.length} {visible.length === 1 ? "item" : "items"}</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select items={STATUS_FILTER_ITEMS} value={statusFilter} onValueChange={(value) => {
              if (typeof value === "string" && STATUS_FILTER_ITEMS.some((option) => option.value === value)) setStatusFilter(value)
            }}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_FILTER_ITEMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select items={TYPE_FILTER_ITEMS} value={typeFilter} onValueChange={(value) => {
              if (typeof value === "string" && TYPE_FILTER_ITEMS.some((option) => option.value === value)) setTypeFilter(value)
            }}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TYPE_FILTER_ITEMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {statusError ? <p role="alert" className="mb-3 text-sm text-destructive">{statusError}</p> : null}
          {visible.length ? (
            <ul className="divide-y divide-border/70">
              {visible.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${item.status === "resolved" ? "text-muted-foreground line-through" : ""}`}>{item.title}</p>
                    {item.details ? <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{item.details}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={item.type === "Bug" ? "destructive" : "secondary"}>{item.type}</Badge>
                      <Badge variant="outline" className="capitalize">{item.priority}</Badge>
                      <span>Added {formatDateShort(item.createdAt)}, {item.createdAt.slice(0, 4)}</span>
                      {item.resolvedAt ? <span>· Resolved {formatDateShort(item.resolvedAt)}, {item.resolvedAt.slice(0, 4)}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select items={STATUS_ITEMS} value={item.status} onValueChange={(value) => {
                      if (STATUS_ITEMS.some((option) => option.value === value)) changeStatus(item, value as FeedbackStatus)
                    }}>
                      <SelectTrigger size="sm" className="w-32" aria-label={`Status of ${item.title}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {STATUS_ITEMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Edit ${item.title}`} onClick={() => openDialog(item)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${item.title}`} onClick={() => onDelete(item.id)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={MessageSquarePlus}
              title={items.length ? "Nothing matches these filters" : "No feedback yet"}
              description={items.length ? "Try a different status or type." : "Add an enhancement idea, a bug, or general feedback."}
              action={items.length ? undefined : <Button size="sm" onClick={() => openDialog(null)}><Plus data-icon="inline-start" aria-hidden="true" />Add item</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "Add feedback or enhancement"}</DialogTitle>
            <DialogDescription>{editing ? "Update the details or move it along." : "New items start as Open."}</DialogDescription>
          </DialogHeader>
          {dialogOpen ? (
            <FeedbackForm
              key={editing?.id ?? "new"}
              item={editing}
              today={today}
              onSave={async (item) => { await onSave(item); setDialogOpen(false) }}
              onCancel={() => setDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
