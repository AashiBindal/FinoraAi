import { useEffect, useState } from 'react'
import { Markdown } from '../../components/ui/Markdown'
import { Button, Card, ErrorState, LoadingState, PageHeader, Textarea, cx, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'

export default function Documentation() {
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(() => api.docs.list(), [])
  const [slug, setSlug] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const sections = data ?? []
  const current = sections.find((s) => s.slug === slug) ?? sections[0]

  useEffect(() => {
    setEditing(false)
  }, [slug])

  async function save() {
    if (!current) return
    setSaving(true)
    try {
      const updated = await api.docs.update(current.slug, { content: draft })
      setData(sections.map((s) => (s.slug === updated.slug ? updated : s)))
      setEditing(false)
      toast.success(`${updated.title} saved`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const header = (
    <PageHeader
      title="Documentation Center"
      description="Living project documentation, stored in the database and editable by the whole team. Supports Markdown."
    />
  )
  if (loading) return (<>{header}<LoadingState /></>)
  if (error) return (<>{header}<ErrorState error={error} onRetry={reload} /></>)

  return (
    <>
      {header}
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="space-y-0.5 lg:sticky lg:top-6 lg:self-start">
          {sections.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setSlug(s.slug)}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                current?.slug === s.slug ? 'bg-hover text-fg' : 'text-muted hover:bg-hover/60 hover:text-fg',
              )}
            >
              <span className="w-4 text-right text-[11px] tabular-nums text-faint">{i + 1}</span>
              {s.title}
            </button>
          ))}
        </nav>

        {current && (
          <Card className="min-h-[60vh]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-semibold">{current.title}</h2>
                <p className="text-xs text-faint">Updated {timeAgo(current.updated_at)}</p>
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" icon="save" loading={saving} onClick={save}>
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  icon="edit"
                  onClick={() => {
                    setDraft(current.content)
                    setEditing(true)
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            {editing ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[55vh] font-mono text-xs" spellCheck={false} />
                <div className="hidden rounded-lg border border-dashed border-line p-4 xl:block">
                  <div className="mb-3 text-[11px] uppercase tracking-wider text-faint">Preview</div>
                  <Markdown source={draft} />
                </div>
              </div>
            ) : current.content.trim() ? (
              <Markdown source={current.content} />
            ) : (
              <p className="text-sm text-faint italic">Empty section. Click Edit to start writing.</p>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
