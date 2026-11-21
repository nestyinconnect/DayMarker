import { useState } from "react"
import { ArrowDown, ArrowUp, CalendarClock, ListPlus, Sun, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { formatRelativeDate } from "@/components/planner-data"
import { EmptyState } from "@/components/planner-shared"
import type { PlannerTask } from "@/components/planner-types"

export function unplanTask(task: PlannerTask): PlannerTask {
  const { plannedFor: _plannedFor, planOrder: _planOrder, ...rest } = task
  return rest
}

export function PlannerTodayPlan({
  tasks,
  today,
  onToggle,
  onUpdateTasks,
}: {
  tasks: PlannerTask[]
  today: string
  onToggle: (id: string, completed: boolean) => void
  onUpdateTasks: (tasks: PlannerTask[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const bucket = tasks
    .filter((task) => task.plannedFor === today)
    .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0) || a.dueDate.localeCompare(b.dueDate))
  const doneCount = bucket.filter((task) => task.completed).length
  const leftover = tasks.filter((task) => !task.completed && task.plannedFor && task.plannedFor < today)
  const candidates = tasks
    .filter((task) => !task.completed && task.plannedFor !== today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const suggested = candidates.filter((task) => task.dueDate <= today)
  const pickList = showAll ? candidates : suggested
  const nextOrder = bucket.reduce((max, task) => Math.max(max, task.planOrder ?? 0), 0) + 1

  async function save(updated: PlannerTask[]) {
    if (!updated.length) return
    setBusy(true)
    setError("")
    try {
      await onUpdateTasks(updated)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update today's plan.")
    } finally {
      setBusy(false)
    }
  }

  function addToToday(ids: string[]) {
    const picked = tasks.filter((task) => ids.includes(task.id))
    void save(picked.map((task, index) => ({ ...task, plannedFor: today, planOrder: nextOrder + index }))).then(() => {
      setSelected((current) => current.filter((id) => !ids.includes(id)))
    })
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= bucket.length) return
    const reordered = [...bucket]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    void save(reordered
      .map((task, position) => ({ ...task, planOrder: position + 1 }))
      .filter((task, position) => bucket[position].id !== task.id || bucket[position].planOrder !== task.planOrder))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListPlus aria-hidden="true" className="size-4 text-primary" />Pick for today</CardTitle>
          <CardDescription className="mt-1">Select open tasks and put them in today&rsquo;s bucket. They stay in your task list too.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div role="group" aria-label="Which tasks to show" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <Button type="button" size="xs" variant={!showAll ? "default" : "ghost"} aria-pressed={!showAll} onClick={() => setShowAll(false)}>
              Due or overdue ({suggested.length})
            </Button>
            <Button type="button" size="xs" variant={showAll ? "default" : "ghost"} aria-pressed={showAll} onClick={() => setShowAll(true)}>
              All open ({candidates.length})
            </Button>
          </div>

          {pickList.length ? (
            <ul className="divide-y divide-border/70">
              {pickList.map((task) => {
                const inputId = `pick-${task.id}`
                const overdue = task.dueDate < today
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <Checkbox
                      id={inputId}
                      checked={selected.includes(task.id)}
                      onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, task.id] : current.filter((id) => id !== task.id))}
                    />
                    <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {overdue ? "Overdue · " : ""}{formatRelativeDate(task.dueDate, today)}
                        {task.plannedFor && task.plannedFor < today ? " · planned earlier" : ""}
                      </span>
                    </label>
                    <Badge variant="outline" className="hidden sm:inline-flex">{task.category ?? "Other"}</Badge>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={`Add ${task.title} to today`} onClick={() => addToToday([task.id])}>
                      <Sun aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {showAll ? "Every open task is already in today’s plan." : "Nothing due or overdue. Switch to “All open” to pick ahead."}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <div className="flex gap-2">
              {selected.length ? <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button> : null}
              <Button type="button" size="sm" disabled={busy || !selected.length} onClick={() => addToToday(selected)}>
                <Sun data-icon="inline-start" aria-hidden="true" />Add to today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Sun aria-hidden="true" className="size-4 text-primary" />Today&rsquo;s bucket</CardTitle>
            <CardDescription className="mt-1">{doneCount} of {bucket.length} done. Reorder to decide what comes first.</CardDescription>
          </div>
          <Badge variant="secondary">{bucket.length - doneCount} to go</Badge>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {bucket.length ? <Progress value={(doneCount / bucket.length) * 100} aria-label="Today's plan progress" /> : null}

          {leftover.length ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock aria-hidden="true" className="size-3.5" />
                {leftover.length} unfinished from an earlier plan
              </span>
              <Button type="button" size="xs" variant="outline" disabled={busy} onClick={() => addToToday(leftover.map((task) => task.id))}>Bring to today</Button>
            </div>
          ) : null}

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          {bucket.length ? (
            <ol className="divide-y divide-border/70">
              {bucket.map((task, index) => {
                const inputId = `today-${task.id}`
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground tabular-nums">{index + 1}</span>
                    <Checkbox
                      id={inputId}
                      checked={task.completed}
                      aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
                      onCheckedChange={(checked) => onToggle(task.id, checked === true)}
                    />
                    <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
                      <span className={`block truncate text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
                      <span className="text-xs text-muted-foreground">Due {formatRelativeDate(task.dueDate, today).toLowerCase()} · {task.category ?? "Other"}</span>
                    </label>
                    <div className="flex shrink-0 items-center">
                      <Button type="button" variant="ghost" size="icon-sm" disabled={busy || index === 0} aria-label={`Move ${task.title} up`} onClick={() => move(index, -1)}>
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" disabled={busy || index === bucket.length - 1} aria-label={`Move ${task.title} down`} onClick={() => move(index, 1)}>
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" disabled={busy} aria-label={`Remove ${task.title} from today`} onClick={() => void save([unplanTask(task)])}>
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <EmptyState
              icon={Sun}
              title="Nothing planned yet"
              description="Pick a few tasks on the left to shape your day."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
