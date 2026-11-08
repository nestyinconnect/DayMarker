import type { EventCategory, ExpenseCategory, GoalPeriod, PlannerData } from "@/components/planner-types"

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Groceries",
  "Dining",
  "Transport",
  "Home",
  "Wellness",
  "Other",
]

export const EVENT_CATEGORIES: EventCategory[] = [
  "Work & Office",
  "Faith & Spiritual",
  "Shopping & Errands",
  "Achievements",
  "Happy Moments",
  "Festivals & Holidays",
  "Family & Friends",
  "Health & Wellness",
  "Travel",
  "Other",
]

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(year, month - 1, day + days, 12)
  return toDateKey(date)
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1, 12),
  )
}

export function formatDateLong(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12))
}

export function formatDateShort(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day, 12))
}

export function formatRelativeDate(dateKey: string, today: string) {
  if (dateKey === today) return "Today"
  if (dateKey === shiftDateKey(today, 1)) return "Tomorrow"
  if (dateKey === shiftDateKey(today, -1)) return "Yesterday"
  return formatDateShort(dateKey)
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatTime(value: string) {
  if (value === "All day") return value
  const [hour, minute] = value.split(":").map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour, minute))
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function getGoalDeadline(dateKey: string, period: GoalPeriod) {
  const [year, month] = dateKey.split("-").map(Number)
  if (period === "year") return `${year}-12-31`
  return toDateKey(new Date(year, month, 0, 12))
}

export function createDemoData(today: string): PlannerData {
  const date = (offset: number) => shiftDateKey(today, offset)
  const dateTime = (offset: number, time: string) => `${date(offset)}T${time}`

  return {
    expenses: [
      { id: "expense-1", title: "Market haul", amount: 68.42, category: "Groceries", date: today },
      { id: "expense-2", title: "Coffee and pastry", amount: 13.25, category: "Dining", date: today },
      { id: "expense-3", title: "Transit card", amount: 36, category: "Transport", date: date(-1) },
      { id: "expense-4", title: "Home supplies", amount: 29.78, category: "Home", date: date(-3) },
      { id: "expense-5", title: "Pharmacy", amount: 18.8, category: "Wellness", date: date(-5) },
    ],
    tasks: [
      { id: "task-1", title: "Review this month’s spending", dueDate: today, priority: "high", completed: false },
      { id: "task-2", title: "Plan groceries for the week", dueDate: today, priority: "normal", completed: false },
      { id: "task-3", title: "Send the project update", dueDate: date(1), priority: "high", completed: false },
      { id: "task-4", title: "Read for twenty minutes", dueDate: date(1), priority: "low", completed: true },
      { id: "task-5", title: "Book an annual checkup", dueDate: date(3), priority: "normal", completed: false },
    ],
    goals: [
      { id: "goal-1", title: "Move for 20 minutes, four days a week", period: "month", progress: 62, targetDate: getGoalDeadline(today, "month") },
      { id: "goal-2", title: "Build a three-month cushion", period: "month", progress: 38, targetDate: getGoalDeadline(today, "month") },
      { id: "goal-3", title: "Put away $3,000 for a slow summer", period: "year", progress: 58, targetDate: getGoalDeadline(today, "year") },
    ],
    reminders: [
      { id: "reminder-1", title: "Move laundry to the dryer", remindAt: dateTime(0, "17:00"), completed: false },
      { id: "reminder-2", title: "Call the dentist", remindAt: dateTime(1, "09:30"), completed: false },
      { id: "reminder-3", title: "Review subscriptions", remindAt: dateTime(2, "18:00"), completed: false },
    ],
    events: [
      { id: "event-1", title: "Weekly reset", category: "Other", date: today, time: "10:00", allDay: false },
      { id: "event-2", title: "Design review", category: "Work & Office", date: date(1), time: "14:30", allDay: false },
      { id: "event-3", title: "Dinner with Sam", category: "Family & Friends", date: date(3), time: "18:00", allDay: false },
      { id: "event-4", title: "Payday", category: "Other", date: date(6), time: "All day", allDay: true },
    ],
  }
}
