import { useState } from "react"
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Pencil, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { EVENT_CATEGORIES, formatDateLong, formatTime, monthLabel, toDateKey } from "@/components/planner-data"
import { EmptyState, SectionHeader } from "@/components/planner-shared"
import type { CalendarEvent, EventCategory } from "@/components/planner-types"

function getCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const firstOfMonth = new Date(year, month - 1, 1, 12)
  const start = new Date(year, month - 1, 1 - firstOfMonth.getDay(), 12)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12)
    return { dateKey: toDateKey(date), day: date.getDate(), inMonth: date.getMonth() === firstOfMonth.getMonth() }
  })
}

function shiftMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1 + amount, 1, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function PlannerCalendar({
  events,
  today,
  selectedDate,
  onSelectDate,
  onAdd,
  onEdit,
  onDelete,
}: {
  events: CalendarEvent[]
  today: string
  selectedDate: string
  onSelectDate: (date: string) => void
  onAdd: (date: string) => void
  onEdit: (event: CalendarEvent) => void
  onDelete: (id: string) => void
}) {
  const [visibleMonth, setVisibleMonth] = useState(today.slice(0, 7))
  const [eventMonthFilter, setEventMonthFilter] = useState("all")
  const [eventCategoryFilter, setEventCategoryFilter] = useState("all")
  const year = today.slice(0, 4)
  const eventMonths = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0")
    const label = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Number(year), index, 1, 12))
    return { value: month, label }
  })
  const monthItems = [{ value: "all", label: "All" }, ...eventMonths]
  const categoryItems = [{ value: "all", label: "All" }, ...EVENT_CATEGORIES.map((category) => ({ value: category, label: category }))]
  const days = getCalendarDays(visibleMonth)
  const dayEvents = events.filter((event) => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time))
  const filteredEvents = events
    .filter((event) => event.date.startsWith(`${year}-`))
    .filter((event) => eventMonthFilter === "all" || event.date.slice(5, 7) === eventMonthFilter)
    .filter((event) => eventCategoryFilter === "all" || (event.category ?? "Other") === eventCategoryFilter)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const eventCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.date] = (counts[event.date] ?? 0) + 1
    return counts
  }, {})

  function changeMonth(amount: number) {
    const nextMonth = shiftMonth(visibleMonth, amount)
    setVisibleMonth(nextMonth)
    onSelectDate(`${nextMonth}-01`)
  }

  function selectDay(dateKey: string) {
    onSelectDate(dateKey)
    if (dateKey.slice(0, 7) !== visibleMonth) setVisibleMonth(dateKey.slice(0, 7))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Plans, in their place"
        description="Choose a day to see what’s happening or add something to the calendar."
        action={<Button onClick={() => onAdd(selectedDate)}><CalendarPlus data-icon="inline-start" aria-hidden="true" />Add event</Button>}
      />
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{monthLabel(visibleMonth)}</CardTitle>
              <CardDescription className="mt-1">{events.length} events on your calendar</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => changeMonth(-1)}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => changeMonth(1)}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div role="grid" aria-label={`${monthLabel(visibleMonth)} calendar`} className="grid grid-cols-7 gap-1">
              {weekdays.map((weekday) => (
                <div key={weekday} role="columnheader" className="py-2 text-center text-xs font-medium text-muted-foreground">{weekday}</div>
              ))}
              {days.map(({ dateKey, day, inMonth }) => {
                const isSelected = selectedDate === dateKey
                const isToday = today === dateKey
                const count = eventCounts[dateKey] ?? 0
                return (
                  <div key={dateKey} role="gridcell" className="min-w-0">
                    <button
                      type="button"
                      aria-label={`${formatDateLong(dateKey)}${count ? `, ${count} ${count === 1 ? "event" : "events"}` : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => selectDay(dateKey)}
                      className={`flex min-h-[54px] w-full flex-col items-center gap-1 rounded-xl p-1.5 text-sm transition-colors sm:min-h-[74px] sm:items-start sm:p-2 ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"} ${!inMonth && !isSelected ? "text-muted-foreground/45" : ""}`}
                    >
                      <span className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${isToday && !isSelected ? "bg-primary/10 text-primary" : ""}`}>{day}</span>
                      <span className="flex min-h-2 items-center gap-1" aria-hidden="true">
                        {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                          <span key={index} className={`size-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                        ))}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Event on this day</span>
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary/30" />Today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Day agenda</CardTitle>
              <CardDescription className="mt-1">{formatDateLong(selectedDate)}</CardDescription>
            </div>
            <Badge variant="secondary">{dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {dayEvents.length ? (
              <div>
                {dayEvents.map((event, index) => (
                  <div key={event.id}>
                    <div className="flex items-start gap-3 py-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{event.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="h-5 px-2 text-[10px]">{event.category ?? "Other"}</Badge>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 aria-hidden="true" className="size-3.5" />{event.allDay ? "All day" : formatTime(event.time)}
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Edit event: ${event.title}`} onClick={() => onEdit(event)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Remove event: ${event.title}`} onClick={() => onDelete(event.id)}>
                        <span className="sr-only">Remove event</span>
                        <Plus aria-hidden="true" className="rotate-45" />
                      </Button>
                    </div>
                    {index < dayEvents.length - 1 ? <Separator /> : null}
                  </div>
                ))}
                <Button variant="outline" className="mt-3 w-full" onClick={() => onAdd(selectedDate)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />Add to this day
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Nothing planned for this day"
                description="Leave it open or add a plan you want to remember."
                action={<Button size="sm" onClick={() => onAdd(selectedDate)}><Plus data-icon="inline-start" aria-hidden="true" />Add event</Button>}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events this year</CardTitle>
          <CardDescription>Filter the year’s events by month and category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="event-list-month">Month</FieldLabel>
              <Select items={monthItems} value={eventMonthFilter} onValueChange={(value) => {
                if (typeof value === "string" && (value === "all" || eventMonths.some((month) => month.value === value))) {
                  setEventMonthFilter(value)
                }
              }}>
                <SelectTrigger id="event-list-month" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All</SelectItem>
                    {eventMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="event-list-category">Category</FieldLabel>
              <Select items={categoryItems} value={eventCategoryFilter} onValueChange={(value) => {
                if (typeof value === "string" && (value === "all" || EVENT_CATEGORIES.includes(value as EventCategory))) {
                  setEventCategoryFilter(value)
                }
              }}>
                <SelectTrigger id="event-list-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All</SelectItem>
                    {EVENT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <div aria-live="polite" className="text-xs text-muted-foreground">
            {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
          </div>
          {filteredEvents.length ? (
            <div className="divide-y divide-border/70">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateLong(event.date)} · {event.allDay ? "All day" : formatTime(event.time)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="w-fit">{eventMonths[Number(event.date.slice(5, 7)) - 1].label}</Badge>
                    <Badge variant="secondary" className="w-fit">{event.category ?? "Other"}</Badge>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Edit event: ${event.title}`} onClick={() => onEdit(event)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No events match these filters"
              description={`There are no matching events in ${year}.`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
