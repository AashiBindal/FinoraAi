import { useState } from 'react'
import { AgentLoopDiagram, ArchitectureDiagram, LAYERS } from '../../components/architecture/ArchitectureDiagram'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  IconButton,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  SampleBadge,
  Select,
  Textarea,
  useToast,
} from '../../components/ui'
import { api } from '../../lib/api'
import { INTEGRATION_STATUS } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import type { Integration, IntegrationInput, IntegrationStatus, Layer } from '../../types'

const EMPTY: IntegrationInput = { name: '', layer: 'tools', status: 'planned', description: '' }

export default function Architecture() {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => api.integrations.list(), [])
  const [editing, setEditing] = useState<Integration | null>(null)
  const [form, setForm] = useState<IntegrationInput | null>(null)
  const [saving, setSaving] = useState(false)

  const open = (item?: Integration) => {
    setEditing(item ?? null)
    setForm(item ? { name: item.name, layer: item.layer, status: item.status, description: item.description } : { ...EMPTY })
  }

  async function save() {
    if (!form?.name?.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      if (editing) await api.integrations.update(editing.id, form)
      else await api.integrations.create(form)
      setForm(null)
      await reload(true)
      toast.success('Integration saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function remove(item: Integration) {
    if (!confirm(`Remove "${item.name}"?`)) return
    try {
      await api.integrations.remove(item.id)
      await reload(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <>
      <PageHeader
        title="System Architecture"
        description="Five decoupled layers. Each can be swapped or extended without rewriting the others."
        actions={
          <Button variant="primary" icon="plus" onClick={() => open()}>
            Document integration
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Architecture diagram" subtitle="Live: reflects the integrations documented below" icon="layers" />
            <ArchitectureDiagram integrations={data ?? []} />
          </Card>

          <Card>
            <CardHeader title="Agent execution loop" subtitle="workspace-api/app/agents/runtime.py" icon="brain" />
            <AgentLoopDiagram />
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader title="Integrations" subtitle="Models, APIs, databases and services — planned or connected" icon="plug" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs text-faint">
                    <th className="px-5 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Layer</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(data ?? []).map((i) => (
                    <tr key={i.id} className="group hover:bg-panel-2/60">
                      <td className="px-5 py-2.5 font-medium">
                        <span className="flex items-center gap-2">
                          {i.name} {i.is_sample && <SampleBadge />}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted">{LAYERS[i.layer].title}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={INTEGRATION_STATUS[i.status].tone} dot>
                          {INTEGRATION_STATUS[i.status].label}
                        </Badge>
                      </td>
                      <td className="max-w-md px-3 py-2.5 text-xs text-muted">{i.description}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                          <IconButton icon="edit" label="Edit" onClick={() => open(i)} />
                          <IconButton icon="trash" label="Delete" onClick={() => remove(i)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={!!form}
        title={editing ? 'Edit integration' : 'Document integration'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {form && (
          <>
            <Field label="Name">
              <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. OpenWeather API" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Layer">
                <Select value={form.layer} onChange={(e) => setForm({ ...form, layer: e.target.value as Layer })}>
                  {(Object.keys(LAYERS) as Layer[]).map((l) => (
                    <option key={l} value={l}>
                      {LAYERS[l].title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IntegrationStatus })}>
                  {(Object.keys(INTEGRATION_STATUS) as IntegrationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {INTEGRATION_STATUS[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notes" hint="Purpose, endpoint, auth method, rate limits…">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </>
        )}
      </Modal>
    </>
  )
}
