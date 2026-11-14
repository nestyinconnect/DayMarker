"use client"

import { useState, type FormEvent } from "react"
import { AlarmClock, CalendarPlus, CircleDollarSign, Landmark, ListTodo, Target } from "lucide-react"

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
import type { CalendarEvent, CreateKind, EventCategory, ExpenseCategory, GoalPeriod, NewPlannerRecord, Reminder, TaskPriority } from "@/components/planner-types"

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2000, index, 1, 12)),
}))
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1)

function toggleNumber(values: number[], value: number) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value].sort((a, b) => a - b)
}

const CREATE_DETAILS: Record<CreateKind, { title: string; description: string }> = {
  expense: { title: "Add an expense", description: "Capture a purchase and keep your monthly spending in view." },
  deposit: { title: "Add a fixed deposit", description: "Record the deposit details so you know what matures and when." },
  task: { title: "Add a task", description: "Give a small next step a place on your list." },
  goal: { title: "Create a goal", description: "Choose a monthly or year-end focus and track it as you go." },
  reminder: { title: "Set reminders", description: "Pick the months and days to repeat this reminder on." },
  event: { title: "Add an event", description: "Put a plan on the calendar so it has a time and place in your week." },
}

export function PlannerCreateDialog({
  open,
  kind,
  today,
  defaultDate,
  editEvent,
  onOpenChange,
  onCreate,
  onCreateReminders,
}: {
  open: boolean
  kind: CreateKind | null
  today: string
  defaultDate: string
  editEvent?: CalendarEvent | null
  onOpenChange: (open: boolean) => void
  onCreate: (record: NewPlannerRecord) => Promise<void>
  onCreateReminders: (items: Reminder[]) => Promise<void>
}) {
  const [title, setTitle] = useState(editEvent?.title ?? "")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<ExpenseCategory>("Groceries")
  const [date, setDate] = useState(editEvent?.date ?? defaultDate)
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [period, setPeriod] = useState<GoalPeriod>("month")
  const [reminderCategory, setReminderCategory] = useState<EventCategory>("Other")
  const [reminderYear, setReminderYear] = useState(defaultDate.slice(0, 4))
  const [reminderMonths, setReminderMonths] = useState<number[]>([Number(defaultDate.slice(5, 7))])
  const [reminderDays, setReminderDays] = useState<number[]>([Number(defaultDate.slice(8, 10))])
  const [time, setTime] = useState(editEvent && !editEvent.allDay ? editEvent.time : "09:00")
  const [eventCategory, setEventCategory] = useState<EventCategory>(editEvent?.category ?? "Other")
  const [allDay, setAllDay] = useState(editEvent?.allDay ?? false)
  const [accountNumber, setAccountNumber] = useState("")
  const [principal, setPrincipal] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [maturityDate, setMaturityDate] = useState("")
  const [maturityAmount, setMaturityAmount] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const activeKind = kind ?? "expense"
  const isEditing = activeKind === "event" && Boolean(editEvent)
  const details = isEditing
    ? { title: "Edit event", description: "Update the name, date, time, or category of this event." }
    : CREATE_DETAILS[activeKind]
  const yearOptions = [today.slice(0, 4), String(Number(today.slice(0, 4)) + 1)]
  const reminderDates = reminderMonths.flatMap((month) => reminderDays
    .filter((day) => new Date(Number(reminderYear), month - 1, day, 12).getMonth() === month - 1)
    .map((day) => `${reminderYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`))
  const skippedReminderDates = reminderMonths.length * reminderDays.length - reminderDates.length

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError("Add a title to continue.")
      return
    }

    const id = isEditing && editEvent ? editEvent.id : crypto.randomUUID()
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
        if (!reminderDates.length) {
          setError("Pick at least one month and one valid day.")
          return
        }
        await onCreateReminders(reminderDates.map((dateKey) => ({
          id: crypto.randomUUID(),
          title: cleanTitle,
          category: reminderCategory,
          remindAt: `${dateKey}T${time}`,
          completed: false,
        })))
      }

      if (activeKind === "deposit") {
        const cleanAccount = accountNumber.trim()
        const parsedPrincipal = Number(principal)
        const parsedRate = Number(interestRate)
        const parsedMaturity = Number(maturityAmount)
        if (!cleanAccount) {
          setError("Enter the account number.")
          return
        }
        if (!Number.isFinite(parsedPrincipal) || parsedPrincipal <= 0) {
          setError("Enter an investment amount greater than zero.")
          return
        }
        if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
          setError("Enter an interest rate between 0 and 100.")
          return
        }
        if (!maturityDate || maturityDate <= date) {
          setError("Maturity date must be after the deposited date.")
          return
        }
        if (!Number.isFinite(parsedMaturity) || parsedMaturity < parsedPrincipal) {
          setError("Maturity amount should be at least the invested amount.")
          return
        }
        await onCreate({
          kind: "deposit",
          item: {
            id,
            bank: cleanTitle,
            accountNumber: cleanAccount,
            principal: Math.round(parsedPrincipal * 100) / 100,
            interestRate: parsedRate,
            depositDate: date,
            maturityDate,
            maturityAmount: Math.round(parsedMaturity * 100) / 100,
          },
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{details.title}</DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="planner-title">{activeKind === "deposit" ? "Bank" : "Title"}</FieldLabel>
              <Input
                id="planner-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={activeKind === "expense" ? "e.g. Weekly groceries" : activeKind === "deposit" ? "e.g. State Bank of India" : "Give it a clear name"}
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
              <>
                <FieldGroup className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="reminder-category">Category</FieldLabel>
                    <Select value={reminderCategory} onValueChange={(value) => {
                      if (EVENT_CATEGORIES.includes(value as EventCategory)) setReminderCategory(value as EventCategory)
                    }}>
                      <SelectTrigger id="reminder-category" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {EVENT_CATEGORIES.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reminder-year">Year</FieldLabel>
                    <Select value={reminderYear} onValueChange={(value) => {
                      if (typeof value === "string" && yearOptions.includes(value)) setReminderYear(value)
                    }}>
                      <SelectTrigger id="reminder-year" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {yearOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel id="reminder-months-label">Months</FieldLabel>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="xs" onClick={() => setReminderMonths(MONTH_OPTIONS.map((month) => month.value))}>All</Button>
                      <Button type="button" variant="ghost" size="xs" onClick={() => setReminderMonths([])}>Clear</Button>
                    </div>
                  </div>
                  <div role="group" aria-labelledby="reminder-months-label" className="grid grid-cols-6 gap-1">
                    {MONTH_OPTIONS.map((month) => {
                      const selected = reminderMonths.includes(month.value)
                      return (
                        <Button key={month.value} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={() => setReminderMonths((current) => toggleNumber(current, month.value))}>
                          {month.label}
                        </Button>
                      )
                    })}
                  </div>
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel id="reminder-days-label">Days of the month</FieldLabel>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="xs" onClick={() => setReminderDays([...DAY_OPTIONS])}>All</Button>
                      <Button type="button" variant="ghost" size="xs" onClick={() => setReminderDays([])}>Clear</Button>
                    </div>
                  </div>
                  <div role="group" aria-labelledby="reminder-days-label" className="grid grid-cols-7 gap-1">
                    {DAY_OPTIONS.map((day) => {
                      const selected = reminderDays.includes(day)
                      return (
                        <Button key={day} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} className="px-0 tabular-nums" onClick={() => setReminderDays((current) => toggleNumber(current, day))}>
                          {day}
                        </Button>
                      )
                    })}
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="reminder-time">Time</FieldLabel>
                  <Input id="reminder-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
                  <FieldDescription aria-live="polite">
                    {reminderDates.length} {reminderDates.length === 1 ? "reminder" : "reminders"} will be added
                    {skippedReminderDates ? ` · ${skippedReminderDates} invalid ${skippedReminderDates === 1 ? "date" : "dates"} skipped (e.g. Feb 30)` : ""}
                  </FieldDescription>
                </Field>
              </>
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

            {activeKind === "deposit" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="deposit-account">Account number</FieldLabel>
                  <Input id="deposit-account" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} maxLength={34} autoComplete="off" required />
                </Field>
                <FieldGroup className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="deposit-principal">Investment (₹)</FieldLabel>
                    <Input id="deposit-principal" type="number" inputMode="decimal" min="0.01" step="0.01" value={principal} onChange={(event) => setPrincipal(event.target.value)} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="deposit-rate">Interest rate (% p.a.)</FieldLabel>
                    <Input id="deposit-rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="deposit-date">Deposited date</FieldLabel>
                    <Input id="deposit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="deposit-maturity-date">Maturity date</FieldLabel>
                    <Input id="deposit-maturity-date" type="date" value={maturityDate} min={date} onChange={(event) => setMaturityDate(event.target.value)} required />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel htmlFor="deposit-maturity-amount">Maturity amount (₹)</FieldLabel>
                  <Input id="deposit-maturity-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={maturityAmount} onChange={(event) => setMaturityAmount(event.target.value)} required />
                </Field>
              </>
            ) : null}

            {error && (activeKind !== "expense" || error === "Add a title to continue.") ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </FieldGroup>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {activeKind === "expense" ? <CircleDollarSign data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "deposit" ? <Landmark data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "task" ? <ListTodo data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "goal" ? <Target data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "reminder" ? <AlarmClock data-icon="inline-start" aria-hidden="true" /> : null}
              {activeKind === "event" ? <CalendarPlus data-icon="inline-start" aria-hidden="true" /> : null}
              {saving ? "Saving…" : isEditing ? "Save changes" : `Add ${activeKind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
