"use client"

import { useState, type FormEvent } from "react"
import { AlarmClock, CalendarPlus, CircleDollarSign, ListTodo, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EVENT_CATEGORIES, EXPENSE_CATEGORIES, getGoalDeadline } from "@/components/planner-data"
import type { CreateKind, EventCategory, ExpenseCategory, GoalPeriod, NewPlannerRecord, TaskPriority } from "@/components/planner-types"

const CREATE_DETAILS: Record<CreateKind, { title: string; description: string }> = {
  expense: { title: "Add an expense", description: "Capture a purchase and keep your monthly spending in view." },
  task: { title: "Add a task", description: "Give a small next step a place on your list." },
  goal: { title: "Create a goal", description: "Choose a monthly or year-end focus and track it as you go." },
  reminder: { title: "Set a reminder", description: "Keep an important follow-up from slipping through the cracks." },
  event: { title: "Add an event", description: "Put a plan on the calendar so it has a time and place in your week." },
}

export function PlannerCreateDialog({
  open,
  kind,
  today,
  defaultDate,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  kind: CreateKind | null
  today: string
  defaultDate: string
  onOpenChange: (open: boolean) => void
  onCreate: (record: NewPlannerRecord) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<ExpenseCategory>("Groceries")
  const [date, setDate] = useState(defaultDate)
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [period, setPeriod] = useState<GoalPeriod>("month")
  const [remindAt, setRemindAt] = useState(`${defaultDate}T09:00`)
  const [time, setTime] = useState("09:00")
  const [eventCategory, setEventCategory] = useState<EventCategory>("Other")
  const [allDay, setAllDay] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const activeKind = kind ?? "expense"
  const details = CREATE_DETAILS[activeKind]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError("Add a title to continue.")
      return
    }

    const id = crypto.randomUUID()
    setError("")

    setSaving(true)
    try {
      if (activeKind === "expense") {
        const parsedAmount = Number(amount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          setError("Enter an amount greater than zero.")
          return
        }
        await onCreate({
          kind: "expense",
          item: { id, title: cleanTitle, amount: Math.round(parsedAmount * 100) / 100, category, date },
        })
      }

      if (activeKind === "task") {
        await onCreate({
          kind: "task",
          item: { id, title: cleanTitle, dueDate: date, priority, completed: false },
        })
      }

      if (activeKind === "goal") {
        await onCreate({
          kind: "goal",
          item: { id, title: cleanTitle, period, progress: 0, targetDate: getGoalDeadline(today, period) },
        })
      }

      if (activeKind === "reminder") {
        await onCreate({
          kind: "reminder",
          item: { id, title: cleanTitle, remindAt, completed: false },
        })
      }

      if (activeKind === "event") {
        await onCreate({
          kind: "event",
          item: { id, title: cleanTitle, category: eventCategory, date, time: allDay ? "All day" : time, allDay },
        })
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save. Please try again.")
      return
    } finally {
      setSaving(false)
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{details.title}</DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="planner-title">Title</FieldLabel>
              <Input
                id="planner-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={activeKind === "expense" ? "e.g. Weekly groceries" : "Give it a clear name"}
                maxLength={120}
                required
                autoFocus
              />
            </Field>

            {activeKind === "expense" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
                  <Input
                    id="expense-amount"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    aria-invalid={Boolean(error)}
                    required
                  />
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
                <FieldGroup className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="expense-category">Category</FieldLabel>
                    <Select value={category} onValueChange={(value) => {
                      if (typeof value === "string") setCategory(value as ExpenseCategory)
                    }}>
                      <SelectTrigger id="expense-category" className="w-full">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {EXPENSE_CATEGORIES.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="expense-date">Date</FieldLabel>
                    <Input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                  </Field>
                </FieldGroup>
              </>
            ) : null}

            {activeKind === "task" ? (
              <FieldGroup className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="task-due-date">Due date</FieldLabel>
                  <Input id="task-due-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
                  <Select value={priority} onValueChange={(value) => {
                    if (value === "low" || value === "normal" || value === "high") setPriority(value)
                  }}>
                    <SelectTrigger id="task-priority" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            ) : null}

            {activeKind === "goal" ? (
              <Field>
                <FieldLabel htmlFor="goal-period">Time horizon</FieldLabel>
                <Select value={period} onValueChange={(value) => {
                  if (value === "month" || value === "year") setPeriod(value)
                }}>
                  <SelectTrigger id="goal-period" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="year">Year-end</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>Deadline: {getGoalDeadline(today, period)}</FieldDescription>
              </Field>
            ) : null}

            {activeKind === "reminder" ? (
              <Field>
                <FieldLabel htmlFor="reminder-time">Remind me</FieldLabel>
                <Input
                  id="reminder-time"
                  type="datetime-local"
                  value={remindAt}
                  onChange={(event) => setRemindAt(event.target.value)}
                  min={`${today}T00:00`}
                  required
                />
              </Field>
            ) : null}

            {activeKind === "event" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="event-category">Category</FieldLabel>
                  <Select value={eventCategory} onValueChange={(value) => {
                    if (EVENT_CATEGORIES.includes(value as EventCategory)) setEventCategory(value as EventCategory)
                  }}>
                    <SelectTrigger id="event-category" className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {EVENT_CATEGORIES.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <FieldGroup className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="event-date">Date</FieldLabel>
                    <Input id="event-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                  </Field>
                  {!allDay ? (
                    <Field>
                      <FieldLabel htmlFor="event-time">Time</FieldLabel>
                      <Input id="event-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
                    </Field>
                  ) : null}
                </FieldGroup>
                <Field orientation="horizontal" className="items-center gap-3">
                  <Checkbox id="event-all-day" checked={allDay} onCheckedChange={(checked) => setAllDay(checked === true)} />
                  <FieldLabel htmlFor="event-all-day" className="font-normal">All-day event</FieldLabel>
                </Field>
              </>
            ) : null}

            {error && (activeKind !== "expense" || error === "Add a title to continue.") ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </FieldGroup>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {activeKind === "expense" ? <CircleDollarSign data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "task" ? <ListTodo data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "goal" ? <Target data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "reminder" ? <AlarmClock data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "event" ? <CalendarPlus data-icon="inline-start" aria-hidden="true" /> : null}
              {saving ? "Saving…" : `Add ${activeKind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
