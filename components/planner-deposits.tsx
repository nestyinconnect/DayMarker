import { useState } from "react"
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react"

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
  onEdit,
  onDelete,
}: {
  deposits: FixedDeposit[]
  today: string
  onAdd: () => void
  onEdit: (deposit: FixedDeposit) => void
  onDelete: (id: string) => void
}) {
  const [monthFilter, setMonthFilter] = useState("all")
  const [bankFilter, setBankFilter] = useState("all")
  const [groupBy, setGroupBy] = useState<"month" | "bank">("month")
  const sorted = [...deposits].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
  const maturityMonths = Array.from(new Set(sorted.map((deposit) => deposit.maturityDate.slice(0, 7))))
  const banks = Array.from(new Set(sorted.map((deposit) => deposit.bank.trim()))).sort((a, b) => a.localeCompare(b))
  const monthItems = [{ value: "all", label: "All" }, ...maturityMonths.map((month) => ({ value: month, label: monthLabel(month) }))]
  const bankItems = [{ value: "all", label: "All banks" }, ...banks.map((bank) => ({ value: bank, label: bank }))]
  const activeMonth = monthFilter === "all" || maturityMonths.includes(monthFilter) ? monthFilter : "all"
  const activeBank = bankFilter === "all" || banks.includes(bankFilter) ? bankFilter : "all"
  const visible = sorted
    .filter((deposit) => activeMonth === "all" || deposit.maturityDate.startsWith(activeMonth))
    .filter((deposit) => activeBank === "all" || deposit.bank.trim() === activeBank)
  const groups = (groupBy === "month" ? maturityMonths : banks)
    .map((key) => ({
      key,
      label: groupBy === "month" ? monthLabel(key) : key,
      items: visible.filter((deposit) => groupBy === "month" ? deposit.maturityDate.startsWith(key) : deposit.bank.trim() === key),
    }))
    .filter((group) => group.items.length)

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
        <CardHeader className="flex flex-col gap-4 space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{groupBy === "month" ? "By maturity month" : "By bank"}</CardTitle>
              <CardDescription className="mt-1">{visible.length} {visible.length === 1 ? "deposit" : "deposits"}</CardDescription>
            </div>
            <div role="group" aria-label="Group deposits by" className="flex gap-1 rounded-lg bg-muted p-1">
              <Button type="button" size="xs" variant={groupBy === "month" ? "default" : "ghost"} aria-pressed={groupBy === "month"} onClick={() => setGroupBy("month")}>Maturity month</Button>
              <Button type="button" size="xs" variant={groupBy === "bank" ? "default" : "ghost"} aria-pressed={groupBy === "bank"} onClick={() => setGroupBy("bank")}>Bank</Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
          <Field>
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
          <Field>
            <FieldLabel htmlFor="deposit-bank">Bank</FieldLabel>
            <Select items={bankItems} value={activeBank} onValueChange={(value) => {
              if (typeof value === "string" && bankItems.some((item) => item.value === value)) setBankFilter(value)
            }}>
              <SelectTrigger id="deposit-bank" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {bankItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {groups.length ? groups.map(({ key, label, items }, groupIndex) => (
            <section key={key} aria-labelledby={`deposit-group-${groupIndex}`}>
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/70 pb-2">
                <div className="min-w-0">
                  <h3 id={`deposit-group-${groupIndex}`} className="truncate text-sm font-semibold">{label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "deposit" : "deposits"} · {inr.format(items.reduce((sum, deposit) => sum + deposit.principal, 0))} invested
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {inr.format(items.reduce((sum, deposit) => sum + deposit.maturityAmount, 0))} at maturity
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
                        className="text-muted-foreground"
                        aria-label={`Edit deposit: ${deposit.bank} ${deposit.accountNumber}`}
                        onClick={() => onEdit(deposit)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove deposit: ${deposit.bank} ${deposit.accountNumber}`}
                        onClick={() => {
                          if (window.confirm(`Delete the ${deposit.bank} deposit (A/c ${deposit.accountNumber})?`)) onDelete(deposit.id)
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          )) : deposits.length ? (
            <EmptyState
              icon={Landmark}
              title="No deposits match these filters"
              description="Try a different maturity month or bank."
            />
          ) : (
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
