"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  CalendarDays,
  Landmark,
  LayoutDashboard,
  ListTodo,
  Sparkles,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { MetricCard } from "@/components/planner-shared"
import { PlannerCalendar } from "@/components/planner-calendar"
import { PlannerCreateDialog } from "@/components/planner-create-dialog"
import { PlannerDeposits } from "@/components/planner-deposits"
import { PlannerExpenses } from "@/components/planner-expenses"
import { PlannerGoals } from "@/components/planner-goals"
import { PlannerOverview } from "@/components/planner-overview"
import { PlannerReminders } from "@/components/planner-reminders"
import { PlannerTasks } from "@/components/planner-tasks"
import { formatCurrency, formatDateLong } from "@/components/planner-data"
import type { CalendarEvent, CreateKind, NewPlannerRecord, PlannerData, PlannerView, Reminder } from "@/components/planner-types"
import { cn } from "@/lib/utils"

const NAV_ITEMS: { id: PlannerView; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "expenses", label: "Expenses", icon: WalletCards },
  { id: "deposits", label: "Deposits", icon: Landmark },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "goals", label: "Goals", icon: Target },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "reminders", label: "Reminders", icon: Bell },
]

const PAGE_COPY: Record<PlannerView, { title: string; description: string }> = {
  overview: {
    title: "A calmer way to keep up.",
    description: "A small snapshot of what you’ve spent, what’s next, and what matters this month.",
  },
  expenses: {
    title: "Where your money goes.",
    description: "Keep everyday spending visible, without making it complicated.",
  },
  deposits: {
    title: "Savings that grow.",
    description: "Keep every fixed deposit, its rate, and its maturity in one place.",
  },
  tasks: {
    title: "One thing at a time.",
    description: "Give the next small step a place, then celebrate when it’s done.",
  },
  goals: {
    title: "Make progress visible.",
    description: "Keep monthly intentions and year-end goals moving at a steady pace.",
  },
  calendar: {
    title: "Plans, in their place.",
    description: "See the shape of your month and make room for what’s coming up.",
  },
  reminders: {
    title: "Keep the small things in view.",
    description: "Set a gentle nudge for the details you don’t want to forget.",
  },
}

function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: PlannerView
  onNavigate: (view: PlannerView) => void
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-semibold tracking-tight">daymark</p>
          <p className="text-xs text-sidebar-foreground/60">Your personal rhythm</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="mt-10 flex flex-col gap-1">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Workspace</p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            aria-current={activeView === id ? "page" : undefined}
            className={cn(
              "h-11 w-full justify-start gap-3 rounded-xl px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              activeView === id && "bg-sidebar-accent text-sidebar-foreground",
            )}
            onClick={() => onNavigate(id)}
          >
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4">
          <p className="text-sm font-medium">A gentle reminder</p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/65">A little progress is still progress. Keep your plans kind to you.</p>
        </div>
        <p className="px-2 text-[11px] text-sidebar-foreground/45">Preview workspace · changes reset on reload</p>
      </div>
    </aside>
  )
}

function MobileNavigation({
  activeView,
  onNavigate,
}: {
  activeView: PlannerView
  onNavigate: (view: PlannerView) => void
}) {
  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 text-sidebar-foreground shadow-lg backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            aria-current={activeView === id ? "page" : undefined}
            className={cn(
              "h-auto min-w-0 flex-1 flex-col gap-1 rounded-xl px-1 py-2 text-[10px] text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              activeView === id && "bg-sidebar-accent text-sidebar-foreground",
            )}
            onClick={() => onNavigate(id)}
          >
            <Icon aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </div>
    </nav>
  )
}

export function PlannerShell({ today }: { today: string }) {
  const [activeView, setActiveView] = useState<PlannerView>("overview")
  const [data, setData] = useState<PlannerData>({ expenses: [], deposits: [], tasks: [], goals: [], reminders: [], events: [] })
  const [clientReady, setClientReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"loading" | "ready" | "error">("loading")
  const [syncMessage, setSyncMessage] = useState("")

  useEffect(() => {
    setClientReady(true)
    let active = true
    fetch("/api/planner")
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Unable to load Google Sheets data.")
        return result as PlannerData
      })
      .then((plannerData) => {
        if (!active) return
        setData(plannerData)
        setSyncStatus("ready")
        setSyncMessage("")
      })
      .catch((error: unknown) => {
        if (!active) return
        setSyncStatus("error")
        setSyncMessage(error instanceof Error ? error.message : "Unable to connect to Google Sheets.")
      })
    return () => { active = false }
  }, [])
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [createDate, setCreateDate] = useState(today)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(today)
  const pageCopy = PAGE_COPY[activeView]

  const monthKey = today.slice(0, 7)
  const monthExpenses = data.expenses.filter((expense) => expense.date.startsWith(monthKey))
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const completedTasks = data.tasks.filter((task) => task.completed).length
  const openTasks = data.tasks.length - completedTasks
  const activeGoals = data.goals.filter((goal) => goal.progress < 100)
  const averageGoalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length)
    : 0
  const upcomingEvents = data.events.filter((event) => event.date >= today).length

  function openCreate(kind: CreateKind, date = today) {
    setEditingEvent(null)
    setCreateDate(date)
    setCreateKind(kind)
  }

  function openEditEvent(event: CalendarEvent) {
    setEditingEvent(event)
    setCreateDate(event.date)
    setCreateKind("event")
  }

  async function persistRecord(kind: string, id: string, item: unknown, operation: "upsert" | "delete") {
    const response = await fetch("/api/planner", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id, item, operation }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Unable to save to Google Sheets.")
    setSyncStatus("ready")
    setSyncMessage("")
  }

  function reportSyncError(error: unknown) {
    setSyncStatus("error")
    setSyncMessage(error instanceof Error ? error.message : "Unable to sync with Google Sheets.")
  }

  async function addReminders(items: Reminder[]) {
    const response = await fetch("/api/planner", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "reminder", operation: "append", items }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Unable to save to Google Sheets.")
    setSyncStatus("ready")
    setSyncMessage("")
    setData((current) => ({ ...current, reminders: [...items, ...current.reminders] }))
  }

  async function addRecord(record: NewPlannerRecord) {
    await persistRecord(record.kind, record.item.id, record.item, "upsert")
    setData((current) => {
      switch (record.kind) {
        case "expense": return { ...current, expenses: [record.item, ...current.expenses] }
        case "deposit": return { ...current, deposits: [record.item, ...current.deposits] }
        case "task": return { ...current, tasks: [record.item, ...current.tasks] }
        case "goal": return { ...current, goals: [record.item, ...current.goals] }
        case "reminder": return { ...current, reminders: [record.item, ...current.reminders] }
        case "event": return { ...current, events: [record.item, ...current.events.filter((item) => item.id !== record.item.id)] }
      }
    })
    if (record.kind === "event") setSelectedCalendarDate(record.item.date)
  }

  function toggleTask(id: string, completed: boolean) {
    const task = data.tasks.find((item) => item.id === id)
    if (!task) return
    const updatedTask = { ...task, completed }
    void persistRecord("task", id, updatedTask, "upsert")
      .then(() => setData((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? updatedTask : item) })))
      .catch(reportSyncError)
  }

  function toggleReminder(id: string, completed: boolean) {
    const reminder = data.reminders.find((item) => item.id === id)
    if (!reminder) return
    const updatedReminder = { ...reminder, completed }
    void persistRecord("reminder", id, updatedReminder, "upsert")
      .then(() => setData((current) => ({ ...current, reminders: current.reminders.map((item) => item.id === id ? updatedReminder : item) })))
      .catch(reportSyncError)
  }

  function advanceGoal(id: string) {
    const goal = data.goals.find((item) => item.id === id)
    if (!goal) return
    const updatedGoal = { ...goal, progress: Math.min(100, goal.progress + 10) }
    void persistRecord("goal", id, updatedGoal, "upsert")
      .then(() => setData((current) => ({ ...current, goals: current.goals.map((item) => item.id === id ? updatedGoal : item) })))
      .catch(reportSyncError)
  }

  function removeExpense(id: string) {
    void persistRecord("expense", id, undefined, "delete")
      .then(() => setData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== id) })))
      .catch(reportSyncError)
  }

  function removeDeposit(id: string) {
    void persistRecord("deposit", id, undefined, "delete")
      .then(() => setData((current) => ({ ...current, deposits: current.deposits.filter((item) => item.id !== id) })))
      .catch(reportSyncError)
  }

  function removeTask(id: string) {
    void persistRecord("task", id, undefined, "delete")
      .then(() => setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== id) })))
      .catch(reportSyncError)
  }

  function removeGoal(id: string) {
    void persistRecord("goal", id, undefined, "delete")
      .then(() => setData((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== id) })))
      .catch(reportSyncError)
  }

  function removeReminder(id: string) {
    void persistRecord("reminder", id, undefined, "delete")
      .then(() => setData((current) => ({ ...current, reminders: current.reminders.filter((item) => item.id !== id) })))
      .catch(reportSyncError)
  }

  function removeEvent(id: string) {
    void persistRecord("event", id, undefined, "delete")
      .then(() => setData((current) => ({ ...current, events: current.events.filter((item) => item.id !== id) })))
      .catch(reportSyncError)
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-client-ready={clientReady ? "true" : "false"}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg">
        Skip to content
      </a>
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground lg:hidden">
                <Sparkles aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight lg:hidden">daymark</p>
                <p className="truncate text-sm font-medium text-muted-foreground">{formatDateLong(today)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={syncStatus === "ready" ? "outline" : "secondary"} className="hidden sm:inline-flex">
                {syncStatus === "loading" ? "Connecting to Sheets" : syncStatus === "ready" ? "Google Sheets connected" : "Sheets disconnected"}
              </Badge>
              <Button className="h-10 rounded-full px-4 shadow-sm" onClick={() => openCreate("event", selectedCalendarDate)}>
                <CalendarDays data-icon="inline-start" aria-hidden="true" />
                Add event
              </Button>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-[1500px] px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-10">
          {syncMessage ? (
            <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {syncMessage}
            </div>
          ) : null}
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{activeView === "overview" ? "Your personal dashboard" : activeView}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{pageCopy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{pageCopy.description}</p>
          </div>

          {activeView === "overview" ? (
            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard label="Spent this month" value={formatCurrency(monthTotal)} caption={`${monthExpenses.length} recorded entries`} icon={WalletCards} />
              <MetricCard label="Tasks to do" value={String(openTasks)} caption={`${completedTasks} already completed`} icon={ListTodo} />
              <MetricCard label="Goals in motion" value={`${averageGoalProgress}%`} caption={`${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"}`} icon={Target} />
              <MetricCard label="Coming up" value={String(upcomingEvents)} caption="Events on your calendar" icon={CalendarDays} />
            </div>
          ) : null}

          {activeView === "overview" ? (
            <PlannerOverview data={data} today={today} onNavigate={setActiveView} onOpenCreate={openCreate} onEditEvent={openEditEvent} onToggleTask={toggleTask} />
          ) : null}
          {activeView === "expenses" ? (
            <PlannerExpenses data={data} today={today} onAdd={() => openCreate("expense")} onDelete={removeExpense} />
          ) : null}
          {activeView === "tasks" ? (
            <PlannerTasks tasks={data.tasks} today={today} onAdd={() => openCreate("task")} onToggle={toggleTask} onDelete={removeTask} />
          ) : null}
          {activeView === "goals" ? (
            <PlannerGoals goals={data.goals} onAdd={() => openCreate("goal")} onAdvance={advanceGoal} onDelete={removeGoal} />
          ) : null}
          {activeView === "calendar" ? (
            <PlannerCalendar
              events={data.events}
              today={today}
              selectedDate={selectedCalendarDate}
              onSelectDate={setSelectedCalendarDate}
              onAdd={(date) => openCreate("event", date)}
              onEdit={openEditEvent}
              onDelete={removeEvent}
            />
          ) : null}
          {activeView === "reminders" ? (
            <PlannerReminders reminders={data.reminders} today={today} onAdd={() => openCreate("reminder")} onToggle={toggleReminder} onDelete={removeReminder} />
          ) : null}
          {activeView === "deposits" ? (
            <PlannerDeposits deposits={data.deposits} today={today} onAdd={() => openCreate("deposit")} onDelete={removeDeposit} />
          ) : null}
        </main>
      </div>

      <MobileNavigation activeView={activeView} onNavigate={setActiveView} />
      <PlannerCreateDialog
        key={`${createKind ?? "closed"}-${createDate}-${editingEvent?.id ?? "new"}`}
        open={createKind !== null}
        kind={createKind}
        today={today}
        defaultDate={createDate}
        editEvent={editingEvent}
        onOpenChange={(open) => { if (!open) { setCreateKind(null); setEditingEvent(null) } }}
        onCreate={addRecord}
        onCreateReminders={addReminders}
      />
    </div>
  )
}
