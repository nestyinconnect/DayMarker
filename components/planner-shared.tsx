import type { ReactNode } from "react"
import { Receipt, Trash2, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateShort, formatRelativeDate } from "@/components/planner-data"
import type { Expense, PlannerTask } from "@/components/planner-types"

export function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string
  value: string
  caption: string
  icon: LucideIcon
}) {
  return (
    <Card className="min-h-[132px]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  )
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  icon: Icon = Receipt,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-5 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="max-w-xs">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense
  onDelete?: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Receipt aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{expense.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="h-5 px-2">{expense.category}</Badge>
          <span>{formatDateShort(expense.date)}</span>
        </div>
      </div>
      <p className="shrink-0 text-right font-semibold tabular-nums">{formatCurrency(expense.amount)}</p>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${expense.title}`}
          onClick={() => onDelete(expense.id)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

export function TaskRow({
  task,
  today,
  onToggle,
  onDelete,
}: {
  task: PlannerTask
  today: string
  onToggle: (id: string, completed: boolean) => void
  onDelete?: (id: string) => void
}) {
  const inputId = `task-${task.id}`
  const priorityVariant = task.priority === "high" ? "destructive" : task.priority === "low" ? "outline" : "secondary"

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50">
      <Checkbox
        id={inputId}
        checked={task.completed}
        aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
        onCheckedChange={(checked) => onToggle(task.id, checked === true)}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={inputId}
          className={`block cursor-pointer truncate text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeDate(task.dueDate, today)}</p>
      </div>
      <Badge variant="outline" className="hidden sm:inline-flex">{task.category ?? "Other"}</Badge>
      <Badge variant={priorityVariant} className="capitalize">{task.priority}</Badge>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${task.title}`}
          onClick={() => onDelete(task.id)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
