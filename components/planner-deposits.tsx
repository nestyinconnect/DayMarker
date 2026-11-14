import { useState } from "react"
import { Landmark, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateShort, monthLabel } from "@/components/planner-data"
import { EmptyState, SectionHeader } from "@/components/planner-shared"
import type { FixedDeposit } from "@/components/planner-types"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

function formatFullDate(dateKey: string) {
  return `${formatDateShort(dateKey)}, ${dateKey.slice(0, 4)}`
}

export function PlannerDeposits({
  deposits,
  today,
  onAdd,
  onDelete,
}: {
  deposits: FixedDeposit[]
  today: string
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  const [monthFilter, setMonthFilter] = useState("all")
  const sorted = [...deposits].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
  const maturityMonths = Array.from(new Set(sorted.map((deposit) => deposit.maturityDate.slice(0, 7))))
  const monthItems = [{ value: "all", label: "All" }, ...maturityMonths.map((month) => ({ value: month, label: monthLabel(month) }))]
  const activeMonth = monthFilter === "all" || maturityMonths.includes(monthFilter) ? monthFilter : "all"
  const visible = sorted.filter((deposit) => activeMonth === "all" || deposit.maturityDate.startsWith(activeMonth))
  const groups = maturityMonths
    .filter((month) => activeMonth === "all" || month === activeMonth)
    .map((month) => ({ month, items: visible.filter((deposit) => deposit.maturityDate.startsWith(month)) }))

  const active = deposits.filter((deposit) => deposit.maturityDate >= today)
  const totalInvested = active.reduce((sum, deposit) => sum + deposit.principal, 0)
  const totalAtMaturity = active.reduce((sum, deposit) => sum + deposit.maturityAmount, 0)
  const maturingThisMonth = deposits.filter((deposit) => deposit.maturityDate.startsWith(today.slice(0, 7))).length

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Fixed deposits, at a glance"
        description="Track each deposit and see what matures when."
        action={<Button onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />Add deposit</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Invested (active)</p><p className="mt-1 text-2xl font-semibold tabular-nums">{inr.format(totalInvested)}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Value at maturity (active)</p><p className="mt-1 text-2xl font-semibold tabular-nums">{inr.format(totalAtMaturity)}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Maturing this month</p><p className="mt-1 text-2xl font-semibold tabular-nums">{maturingThisMonth}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>By maturity month</CardTitle>
            <CardDescription className="mt-1">{visible.length} {visible.length === 1 ? "deposit" : "deposits"}</CardDescription>
          </div>
          <Field className="sm:w-56">
            <FieldLabel htmlFor="deposit-month">Maturity month</FieldLabel>
            <Select items={monthItems} value={activeMonth} onValueChange={(value) => {
              if (typeof value === "string" && monthItems.some((item) => item.value === value)) setMonthFilter(value)
            }}>
              <SelectTrigger id="deposit-month" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {monthItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {groups.length ? groups.map(({ month, items }) => (
            <section key={month} aria-labelledby={`deposit-group-${month}`}>
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/70 pb-2">
                <h3 id={`deposit-group-${month}`} className="text-sm font-semibold">{monthLabel(month)}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {inr.format(items.reduce((sum, deposit) => sum + deposit.maturityAmount, 0))} maturing
                </span>
              </div>
              <div className="divide-y divide-border/70">
                {items.map((deposit) => {
                  const matured = deposit.maturityDate < today
                  return (
                    <div key={deposit.id} className="flex items-start gap-3 py-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Landmark aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{deposit.bank}</p>
                          <Badge variant={matured ? "outline" : "secondary"}>{matured ? "Matured" : "Active"}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">A/c {deposit.accountNumber}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                          <div><dt className="text-muted-foreground">Invested</dt><dd className="font-medium tabular-nums">{inr.format(deposit.principal)}</dd></div>
                          <div><dt className="text-muted-foreground">Interest rate</dt><dd className="font-medium tabular-nums">{deposit.interestRate}% p.a.</dd></div>
                          <div><dt className="text-muted-foreground">Maturity amount</dt><dd className="font-medium tabular-nums">{inr.format(deposit.maturityAmount)}</dd></div>
                          <div><dt className="text-muted-foreground">Deposited</dt><dd className="font-medium">{formatFullDate(deposit.depositDate)}</dd></div>
                          <div><dt className="text-muted-foreground">Matures</dt><dd className="font-medium">{formatFullDate(deposit.maturityDate)}</dd></div>
                          <div><dt className="text-muted-foreground">Interest earned</dt><dd className="font-medium tabular-nums">{inr.format(deposit.maturityAmount - deposit.principal)}</dd></div>
                        </dl>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove deposit: ${deposit.bank} ${deposit.accountNumber}`}
                        onClick={() => onDelete(deposit.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          )) : (
            <EmptyState
              icon={Landmark}
              title="No fixed deposits yet"
              description="Add a deposit to track its maturity date and amount."
              action={<Button size="sm" onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />Add deposit</Button>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
