import { useState } from "react"
import { AlarmClock, Bell, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { EVENT_CATEGORIES, formatDateLong, formatTime } from "@/components/planner-data"
import { EmptyState, SectionHeader } from "@/components/planner-shared"
import type { EventCategory, Reminder } from "@/components/planner-types"

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2000, index, 1, 12)),
}))
const MONTH_ITEMS = [{ value: "all", label: "All" }, ...MONTHS]
const CATEGORY_ITEMS = [{ value: "all", label: "All" }, ...EVENT_CATEGORIES.map((category) => ({ value: category, label: category }))]

export function PlannerReminders({
  reminders,
  today,
  onAdd,
  onToggle,
  onDelete,
}: {
  reminders: Reminder[]
  today: string
  onAdd: () => void
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  const [monthFilter, setMonthFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const sorted = reminders
    .filter((reminder) => monthFilter === "all" || reminder.remindAt.slice(5, 7) === monthFilter)
    .filter((reminder) => categoryFilter === "all" || (reminder.category ?? "Other") === categoryFilter)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
  const activeCount = reminders.filter((reminder) => !reminder.completed).length
  const overdueCount = reminders.filter((reminder) => !reminder.completed && reminder.remindAt.slice(0, 10) < today).length

  return (
    <div className="space-y-4">
      <SectionHeader
        title="A little nudge, at the right time"
        description="Keep important follow-ups close without letting them take over your day."
        action={<Button onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />Set reminder</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs text-muted-foreground">Active</p><p className="mt-1 text-2xl font-semibold tabular-nums">{activeCount}</p></div><Badge variant="secondary">to remember</Badge></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-semibold tabular-nums">{overdueCount}</p></div><Badge variant={overdueCount ? "destructive" : "outline"}>needs a look</Badge></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-semibold tabular-nums">{reminders.length - activeCount}</p></div><Badge variant="outline">done</Badge></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div><CardTitle>Your reminders</CardTitle><CardDescription className="mt-1">Mark one done or remove it when it’s no longer needed.</CardDescription></div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell aria-hidden="true" className="size-4" /></span>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="reminder-list-month">Month</FieldLabel>
              <Select items={MONTH_ITEMS} value={monthFilter} onValueChange={(value) => {
                if (typeof value === "string" && MONTH_ITEMS.some((month) => month.value === value)) setMonthFilter(value)
              }}>
                <SelectTrigger id="reminder-list-month" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MONTH_ITEMS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="reminder-list-category">Category</FieldLabel>
              <Select items={CATEGORY_ITEMS} value={categoryFilter} onValueChange={(value) => {
                if (typeof value === "string" && (value === "all" || EVENT_CATEGORIES.includes(value as EventCategory))) setCategoryFilter(value)
              }}>
                <SelectTrigger id="reminder-list-category" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CATEGORY_ITEMS.map((category) => (
                      <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <div aria-live="polite" className="text-xs text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "reminder" : "reminders"}
          </div>
          {sorted.length ? (
            <div>
              {sorted.map((reminder, index) => {
                const overdue = !reminder.completed && reminder.remindAt.slice(0, 10) < today
                const inputId = `reminder-${reminder.id}`
                return (
                  <div key={reminder.id}>
                    <div className="flex items-center gap-3 py-4">
                      <Checkbox
                        id={inputId}
                        checked={reminder.completed}
                        aria-label={`${reminder.completed ? "Mark incomplete" : "Mark complete"}: ${reminder.title}`}
                        onCheckedChange={(checked) => onToggle(reminder.id, checked === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <label htmlFor={inputId} className={`block cursor-pointer truncate text-sm font-medium ${reminder.completed ? "text-muted-foreground line-through" : ""}`}>
                          {reminder.title}
                        </label>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <AlarmClock aria-hidden="true" className="size-3.5" />{formatDateLong(reminder.remindAt.slice(0, 10))} · {formatTime(reminder.remindAt.slice(11, 16))}
                        </p>
                      </div>
                      <Badge variant="outline" className="hidden sm:inline-flex">{MONTHS[Number(reminder.remindAt.slice(5, 7)) - 1]?.label}</Badge>
                      <Badge variant="secondary" className="hidden sm:inline-flex">{reminder.category ?? "Other"}</Badge>
                      {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                      {!overdue && !reminder.completed ? <Badge variant="secondary">Upcoming</Badge> : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove reminder: ${reminder.title}`}
                        onClick={() => onDelete(reminder.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    {index < sorted.length - 1 ? <Separator /> : null}
                  </div>
                )
              })}
            </div>
          ) : reminders.length ? (
            <EmptyState
              icon={Bell}
              title="No reminders match these filters"
              description="Try a different month or category."
            />
          ) : (
            <EmptyState
              icon={Bell}
              title="No reminders yet"
              description="Set a reminder for something you want to remember later."
              action={<Button size="sm" onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />Set reminder</Button>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
