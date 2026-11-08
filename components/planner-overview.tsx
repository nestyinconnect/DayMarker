import { ArrowRight, CalendarDays, Clock3, Sparkles, Target } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatDateShort, formatTime, monthLabel } from "@/components/planner-data"
import { EmptyState, ExpenseRow, TaskRow } from "@/components/planner-shared"
import type { CreateKind, PlannerData, PlannerView } from "@/components/planner-types"

export function PlannerOverview({
  data,
  today,
  onNavigate,
  onOpenCreate,
  onToggleTask,
}: {
  data: PlannerData
  today: string
  onNavigate: (view: PlannerView) => void
  onOpenCreate: (kind: CreateKind, date?: string) => void
  onToggleTask: (id: string, completed: boolean) => void
}) {
  const monthKey = today.slice(0, 7)
  const monthExpenses = data.expenses.filter((expense) => expense.date.startsWith(monthKey))
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const openTasks = data.tasks.filter((task) => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const upcomingEvents = data.events
    .filter((event) => event.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 3)
  const activeGoals = data.goals.filter((goal) => goal.progress < 100).slice(0, 3)
  const upcomingReminders = data.reminders
    .filter((reminder) => !reminder.completed)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
    .slice(0, 2)
  const recentExpenses = [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-0 bg-sidebar text-sidebar-foreground shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-sidebar-foreground/15 bg-sidebar-accent text-sidebar-foreground">
                Today, in focus
              </Badge>
              <Sparkles aria-hidden="true" className="size-5 text-sidebar-primary" />
            </div>
            <div>
              <CardTitle className="max-w-lg text-2xl leading-tight tracking-tight sm:text-3xl">
                A little clarity goes a long way.
              </CardTitle>
              <CardDescription className="mt-2 max-w-lg text-sidebar-foreground/70">
                Keep your next steps, plans, and spending in one calm place.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sidebar-accent/80 p-3.5">
                <p className="text-xs text-sidebar-foreground/65">Tasks still open</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{openTasks.length}</p>
              </div>
              <div className="rounded-xl bg-sidebar-accent/80 p-3.5">
                <p className="text-xs text-sidebar-foreground/65">Plans coming up</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{upcomingEvents.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onOpenCreate("task")}>
                Add a task
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="border-sidebar-foreground/20 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => onNavigate("calendar")}
              >
                Open calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>One clear next step</CardTitle>
              <CardDescription className="mt-1">A short list is easier to start.</CardDescription>
            </div>
            <Badge variant="secondary">{openTasks.length} open</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {openTasks.length ? (
              <div className="divide-y divide-border/70">
                {openTasks.slice(0, 3).map((task) => (
                  <TaskRow key={task.id} task={task} today={today} onToggle={onToggleTask} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="You’re all caught up"
                description="Add a task when something new needs your attention."
                action={<Button size="sm" onClick={() => onOpenCreate("task")}>Add a task</Button>}
              />
            )}
            {openTasks.length ? (
              <Button variant="ghost" className="mt-2 w-full justify-between" onClick={() => onNavigate("tasks")}>
                See your full list
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Spending snapshot</CardTitle>
              <CardDescription className="mt-1">A quick look at {monthLabel(monthKey)}.</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Add expense" onClick={() => onOpenCreate("expense")}>
              <span className="sr-only">Add expense</span>
              <ArrowRight aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(monthTotal)}</p>
              <Badge variant="secondary">{monthExpenses.length} entries</Badge>
            </div>
            {recentExpenses.length ? (
              <div className="divide-y divide-border/70">
                {recentExpenses.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No spending logged yet"
                description="Add an expense to start your monthly snapshot."
                action={<Button size="sm" onClick={() => onOpenCreate("expense")}>Add expense</Button>}
              />
            )}
            <Button variant="ghost" className="mt-2 w-full justify-between" onClick={() => onNavigate("expenses")}>
              View all expenses
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Coming up</CardTitle>
              <CardDescription className="mt-1">Events and reminders to keep in view.</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Add calendar event" onClick={() => onOpenCreate("event", today)}>
              <CalendarDays aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {upcomingEvents.length ? upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="h-5 px-2 text-[10px]">{event.category ?? "Other"}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {event.date === today ? "Today" : formatDateShort(event.date)} · {event.allDay ? "All day" : formatTime(event.time)}
                    </p>
                  </div>
                </div>
                <Clock3 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </div>
            )) : (
              <EmptyState
                icon={CalendarDays}
                title="A little open space"
                description="Add an event when you have something to look forward to."
                action={<Button size="sm" onClick={() => onOpenCreate("event", today)}>Add an event</Button>}
              />
            )}
            {upcomingReminders.length ? (
              <div className="mt-4 border-t border-border/70 pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Next reminders</p>
                {upcomingReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate">{reminder.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateShort(reminder.remindAt.slice(0, 10))}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <Button variant="ghost" className="w-full justify-between" onClick={() => onNavigate("calendar")}>
              Open calendar
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Goals in motion</CardTitle>
              <CardDescription className="mt-1">Monthly and year-end progress, side by side.</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Add a goal" onClick={() => onOpenCreate("goal")}>
              <Target aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {activeGoals.length ? activeGoals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{goal.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{goal.period === "month" ? "This month" : "Year-end"}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} aria-label={`${goal.title}: ${goal.progress}% complete`} />
              </div>
            )) : (
              <EmptyState
                icon={Target}
                title="Start with one goal"
                description="Choose something meaningful for this month or the year ahead."
                action={<Button size="sm" onClick={() => onOpenCreate("goal")}>Create a goal</Button>}
              />
            )}
            <Button variant="ghost" className="w-full justify-between" onClick={() => onNavigate("goals")}>
              See all goals
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>A gentle nudge</CardTitle>
              <CardDescription className="mt-1">Little things count, too.</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Add reminder" onClick={() => onOpenCreate("reminder")}>
              <Clock3 aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {upcomingReminders.length ? upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{reminder.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{reminder.remindAt.replace("T", " · ")}</p>
                </div>
              </div>
            )) : (
              <EmptyState
                icon={Clock3}
                title="No reminders yet"
                description="Set a nudge for something you want to remember."
                action={<Button size="sm" onClick={() => onOpenCreate("reminder")}>Set reminder</Button>}
              />
            )}
            <Button variant="ghost" className="w-full justify-between" onClick={() => onNavigate("reminders")}>
              Manage reminders
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
