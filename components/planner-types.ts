export type PlannerView = "overview" | "expenses" | "deposits" | "tasks" | "goals" | "calendar" | "reminders" | "feedback" | "sheet"
export type CreateKind = "expense" | "deposit" | "task" | "goal" | "reminder" | "event"
export type ExpenseCategory = string
export type EventCategory = string
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
  category?: EventCategory
  dueDate: string
  priority: TaskPriority
  completed: boolean
  recurrence?: "monthly"
  /** Day of month to keep for every repeat, so 31 → Feb 28 → Mar 31 doesn't drift. */
  repeatDay?: number
  seriesId?: string
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

export interface FixedDeposit {
  id: string
  bank: string
  accountNumber: string
  principal: number
  interestRate: number
  depositDate: string
  maturityDate: string
  maturityAmount: number
}

export type FeedbackType = "Enhancement" | "Bug" | "Feedback"
export type FeedbackStatus = "open" | "in-progress" | "resolved"

export interface FeedbackItem {
  id: string
  title: string
  details?: string
  type: FeedbackType
  priority: TaskPriority
  status: FeedbackStatus
  createdAt: string
  resolvedAt?: string
}

export interface PlannerData {
  categories?: string[]
  expenseCategories?: string[]
  expenses: Expense[]
  deposits: FixedDeposit[]
  tasks: PlannerTask[]
  goals: Goal[]
  reminders: Reminder[]
  events: CalendarEvent[]
  feedback: FeedbackItem[]
}

export type NewPlannerRecord =
  | { kind: "expense"; item: Expense }
  | { kind: "deposit"; item: FixedDeposit }
  | { kind: "task"; item: PlannerTask }
  | { kind: "goal"; item: Goal }
  | { kind: "reminder"; item: Reminder }
  | { kind: "event"; item: CalendarEvent }
