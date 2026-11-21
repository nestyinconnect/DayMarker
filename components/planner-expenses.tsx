import { CircleDollarSign, Plus, Receipt, Tag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDateShort, monthLabel } from "@/components/planner-data"
import { EmptyState, ExpenseRow, MetricCard, SectionHeader } from "@/components/planner-shared"
import type { Expense, PlannerData } from "@/components/planner-types"

export function PlannerExpenses({
  data,
  today,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: PlannerData
  today: string
  onAdd: () => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}) {
  const monthKey = today.slice(0, 7)
  const monthExpenses = data.expenses
    .filter((expense) => expense.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date))
  const allExpenses = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date))
  const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const average = monthExpenses.length ? total / monthExpenses.length : 0
  const totalsByCategory = monthExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount
    return totals
  }, {})
  const categoryRows = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])
  const topCategory = categoryRows[0]

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Monthly overview"
        description={`Your recorded spending for ${monthLabel(monthKey)}.`}
        action={<Button onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />Add expense</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Spent this month" value={formatCurrency(total)} caption={`${monthExpenses.length} recorded ${monthExpenses.length === 1 ? "purchase" : "purchases"}`} icon={CircleDollarSign} />
        <MetricCard label="Average entry" value={formatCurrency(average)} caption="Per recorded purchase" icon={Receipt} />
        <MetricCard label="Top category" value={topCategory?.[0] ?? "—"} caption={topCategory ? formatCurrency(topCategory[1]) : "Add an expense to get started"} icon={Tag} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <CardDescription>See what makes up this month’s total.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryRows.length ? (
              <div className="divide-y divide-border/70">
                {categoryRows.map(([category, amount]) => {
                  const entryCount = monthExpenses.filter((expense) => expense.category === category).length
                  return (
                    <div key={category} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Receipt aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{category}</p>
                          <p className="text-xs text-muted-foreground">
                            {entryCount} {entryCount === 1 ? "entry" : "entries"}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{formatCurrency(amount)}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Receipt}
                title="Nothing to break down"
                description="Your category summary will appear after your first expense."
                action={<Button size="sm" onClick={onAdd}>Add expense</Button>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>All expenses</CardTitle>
              <CardDescription className="mt-1">Most recent entries first.</CardDescription>
            </div>
            <Badge variant="secondary">{allExpenses.length} total</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {allExpenses.length ? (
              <div>
                {allExpenses.map((expense, index) => (
                  <div key={expense.id}>
                    <ExpenseRow expense={expense} onEdit={onEdit} onDelete={onDelete} />
                    {index < allExpenses.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CircleDollarSign}
                title="Start tracking your spending"
                description="Add a purchase to see where your money goes over the month."
                action={<Button size="sm" onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />Add expense</Button>}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
