export type PlannerView = "overview" | "expenses" | "tasks" | "goals" | "calendar" | "reminders"
export type CreateKind = "expense" | "task" | "goal" | "reminder" | "event"
export type ExpenseCategory = "Groceries" | "Dining" | "Transport" | "Home" | "Wellness" | "Other"
export type EventCategory =
  | "Work & Office"
  | "Faith & Spiritual"
  | "Shopping & Errands"
  | "Achievements"
  | "Happy Moments"
  | "Festivals & Holidays"
  | "Family & Friends"
  | "Health & Wellness"
  | "Travel"
  | "Other"
export type TaskPriority = "low" | "normal" | "high"
export type GoalPeriod = "month" | "year"

export interface Expense {
  id: string
  title: string
  amount: number
  category: ExpenseCategory
  date: string
}

export interface PlannerTask {
  id: string
  title: string
  dueDate: string
  priority: TaskPriority
  completed: boolean
}

export interface Goal {
  id: string
  title: string
  period: GoalPeriod
  progress: number
  targetDate: string
}

export interface Reminder {
  id: string
  title: string
  category?: EventCategory
  remindAt: string
  completed: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  category?: EventCategory
  date: string
  time: string
  allDay: boolean
}

export interface PlannerData {
  expenses: Expense[]
  tasks: PlannerTask[]
  goals: Goal[]
  reminders: Reminder[]
  events: CalendarEvent[]
}

export type NewPlannerRecord =
  | { kind: "expense"; item: Expense }
  | { kind: "task"; item: PlannerTask }
  | { kind: "goal"; item: Goal }
  | { kind: "reminder"; item: Reminder }
  | { kind: "event"; item: CalendarEvent }
