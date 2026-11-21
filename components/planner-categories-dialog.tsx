"use client"

import { useState, type FormEvent } from "react"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { OTHER_CATEGORY } from "@/components/planner-data"

const MAX_NAME_LENGTH = 40

export interface CategoryGroup {
  id: string
  label: string
  description: string
  categories: string[]
  usage: Record<string, number>
  onAdd: (name: string) => Promise<void>
  onRename: (from: string, to: string) => Promise<void>
  onDelete: (name: string) => Promise<void>
}

export function PlannerCategoriesDialog({
  open,
  groups,
  initialGroupId,
  onOpenChange,
}: {
  open: boolean
  groups: CategoryGroup[]
  initialGroupId?: string
  onOpenChange: (open: boolean) => void
}) {
  const [activeId, setActiveId] = useState(initialGroupId ?? groups[0]?.id)
  const group = groups.find((item) => item.id === activeId) ?? groups[0]
  const { categories, usage } = group
  const [newName, setNewName] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function validate(name: string, ignore?: string) {
    if (!name) return "Enter a category name."
    if (name.length > MAX_NAME_LENGTH) return `Keep it under ${MAX_NAME_LENGTH} characters.`
    const lower = name.toLowerCase()
    if (categories.some((category) => category !== ignore && category.toLowerCase() === lower)) return "That category already exists."
    return ""
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError("")
    try {
      await action()
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save categories.")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    const problem = validate(name)
    if (problem) return setError(problem)
    if (await run(() => group.onAdd(name))) setNewName("")
  }

  async function handleRename(from: string) {
    const name = editName.trim()
    if (name === from) return setEditing(null)
    const problem = validate(name, from)
    if (problem) return setError(problem)
    if (await run(() => group.onRename(from, name))) setEditing(null)
  }

  async function handleDelete(name: string) {
    const count = usage[name] ?? 0
    if (count && !window.confirm(`${count} item${count === 1 ? "" : "s"} in "${name}" will move to "${OTHER_CATEGORY}". Delete this category?`)) return
    await run(() => group.onDelete(name))
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>{group.description} Renaming or deleting updates existing items.</DialogDescription>
        </DialogHeader>

        {groups.length > 1 ? (
          <div role="group" aria-label="Category list" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {groups.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={item.id === group.id ? "default" : "ghost"}
                aria-pressed={item.id === group.id}
                disabled={busy}
                onClick={() => { setActiveId(item.id); setEditing(null); setError(""); setNewName("") }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        ) : null}

        <ul className="divide-y divide-border/70">
          {categories.map((category) => {
            const isOther = category === OTHER_CATEGORY
            const count = usage[category] ?? 0
            return (
              <li key={category} className="flex items-center gap-2 py-2">
                {editing === category ? (
                  <>
                    <Input
                      aria-label={`Rename ${category}`}
                      value={editName}
                      maxLength={MAX_NAME_LENGTH}
                      autoFocus
                      onChange={(event) => setEditName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); void handleRename(category) }
                        if (event.key === "Escape") { event.preventDefault(); setEditing(null) }
                      }}
                    />
                    <Button type="button" size="icon-sm" disabled={busy} aria-label="Save name" onClick={() => void handleRename(category)}>
                      <Check aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label="Cancel rename" onClick={() => setEditing(null)}>
                      <X aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm">{category}</span>
                    <Badge variant="outline" className="tabular-nums">{count}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      disabled={busy || isOther}
                      aria-label={`Rename ${category}`}
                      onClick={() => { setEditing(category); setEditName(category); setError("") }}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={busy || isOther}
                      aria-label={`Delete ${category}`}
                      onClick={() => void handleDelete(category)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </>
                )}
              </li>
            )
          })}
        </ul>

        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <Input
            aria-label="New category name"
            placeholder="New category"
            value={newName}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button type="submit" disabled={busy}><Plus data-icon="inline-start" aria-hidden="true" />Add</Button>
        </form>

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <p className="text-xs text-muted-foreground">&ldquo;{OTHER_CATEGORY}&rdquo; is the fallback and can&rsquo;t be renamed or deleted.</p>
      </DialogContent>
    </Dialog>
  )
}
