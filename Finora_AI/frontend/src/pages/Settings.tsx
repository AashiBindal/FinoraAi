import { useEffect, useState } from 'react'
import { CategoryBadge, DemoNotice, SectionTitle, Toggle } from '../components/common'
import { Badge, Button, Card, Field, Icon, IconButton, Input, Select, useToast } from '../components/ui'
import { useFinanceData } from '../hooks/useFinance'
import { Link } from '../lib/router'
import { COACH_MODE, DATA_SOURCE, demoDataService } from '../services'
import { API_BASE_URL } from '../services/config'
import type { AlertType, AppSettings } from '../types/finance'
import { ALERT_TYPE } from './SmartAlerts'

const ALERT_DESCRIPTIONS: Record<AlertType, string> = {
  overspending: 'A category goes over its monthly budget',
  budget_utilization: 'A category reaches your warning threshold',
  bill_increase: 'A utility bill is higher than last month',
  goal_behind: 'A goal or the emergency fund falls behind schedule',
  upcoming_payment: 'A subscription renews within 7 days',
  low_savings: 'Monthly savings are below your target',
  price_increase: 'A subscription price goes up',
  unused_subscription: 'A subscription you marked as rarely used',
}

export default function Settings() {
  const { data, saveSettings, saveProfile, resetDemoData, clearAllData, deleteRule } = useFinanceData()
  const toast = useToast()
  const [s, setS] = useState<AppSettings>(data.settings)
  const [name, setName] = useState(data.profile.name)
  const [email, setEmail] = useState(data.profile.email)
  useEffect(() => setS(data.settings), [data.settings])
  useEffect(() => {
    setName(data.profile.name)
    setEmail(data.profile.email)
  }, [data.profile])

  useEffect(() => {
    if (window.location.hash === '#data') document.getElementById('data')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const update = async (next: AppSettings) => {
    setS(next)
    if (await saveSettings(next)) toast.success('Settings saved')
  }

  const saveIdentity = async () => {
    if (!name.trim()) return toast.error('Name is required')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email')
    if (await saveProfile({ ...data.profile, name: name.trim(), email: email.trim() })) toast.success('Profile updated')
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
      <Card>
        <SectionTitle title="Profile" icon="user" subtitle="Income, budgets and preferences live in Money Profile." />
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} disabled={DATA_SOURCE === 'api'} title={DATA_SOURCE === 'api' ? 'Your login email - it cannot be changed here' : undefined} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={saveIdentity} disabled={name === data.profile.name && email === data.profile.email}>
              Save
            </Button>
            <Link to="/profile" className="text-xs text-muted hover:text-fg">
              Open Money Profile →
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Currency & region" icon="coins" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <Select value={s.currency} onChange={() => undefined}>
              <option value="INR">₹ Indian Rupee (INR)</option>
              <option value="USD" disabled>
                $ US Dollar - needs FX rates (backend)
              </option>
              <option value="EUR" disabled>
                € Euro - needs FX rates (backend)
              </option>
            </Select>
          </Field>
          <Field label="Number format">
            <Select value={s.locale} onChange={() => undefined}>
              <option value="en-IN">Indian (1,20,000)</option>
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted">All amounts are stored and shown in INR. Other currencies need exchange-rate support from the backend, so they're disabled rather than showing unconverted numbers.</p>
      </Card>

      <Card>
        <SectionTitle title="Budget preferences" icon="sliders" />
        <Field label={`Warn me when a category reaches ${s.budgetWarningThreshold}% of its budget`}>
          <input type="range" min={50} max={100} step={5} value={s.budgetWarningThreshold} onChange={(e) => setS({ ...s, budgetWarningThreshold: Number(e.target.value) })} onMouseUp={() => update(s)} onKeyUp={() => update(s)} onTouchEnd={() => update(s)} className="w-full" aria-label="Budget warning threshold" />
        </Field>
        <p className="mt-2 text-xs text-muted">
          Category budgets and your savings target are set in{' '}
          <Link to="/profile" className="text-accent hover:underline">
            Money Profile
          </Link>
          .
        </p>
      </Card>

      <Card>
        <SectionTitle title="AI coach" icon="sparkles" action={<Badge tone={COACH_MODE === 'api' ? 'violet' : 'warn'}>{COACH_MODE === 'api' ? 'Backend agent' : 'Demo mode'}</Badge>} />
        <Field label="Response style">
          <Select value={s.coach.responseStyle} onChange={(e) => update({ ...s, coach: { ...s.coach, responseStyle: e.target.value as 'concise' | 'detailed' } })}>
            <option value="concise">Concise</option>
            <option value="detailed">Detailed with explanations</option>
          </Select>
        </Field>
        <Toggle checked={s.coach.showCalculations} onChange={(showCalculations) => update({ ...s, coach: { ...s.coach, showCalculations } })} label="Show calculations" description="Explain how each number was worked out." />
        <p className="mt-2 text-xs text-muted">
          {COACH_MODE === 'api'
            ? 'Questions are sent with a short financial summary to your backend agent, which holds the AI key.'
            : 'No AI model is connected. Replies are rule-based calculations, labelled “Demo response”. Set VITE_FINORA_COACH_MODE=api once the backend has a model configured.'}
        </p>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle title="Notifications" icon="bell" subtitle="Choose which smart alerts appear" />
        <div className="grid gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {(Object.keys(ALERT_TYPE) as AlertType[]).map((t) => (
            <Toggle key={t} checked={s.notifications[t]} onChange={(v) => update({ ...s, notifications: { ...s.notifications, [t]: v } })} label={ALERT_TYPE[t].label} description={ALERT_DESCRIPTIONS[t]} />
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-2" >
        <div id="data" className="scroll-mt-24" />
        <SectionTitle title="Data management" icon="database" action={<Badge tone={DATA_SOURCE === 'api' ? 'ok' : 'warn'}>{DATA_SOURCE === 'api' ? 'Backend' : 'This browser only'}</Badge>} />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-line p-4">
            <div className="text-sm font-medium">Export your data</div>
            <p className="mt-1 mb-3 text-xs text-muted">Download everything as JSON.</p>
            <Button size="sm" icon="download" onClick={() => demoDataService.exportJson(DATA_SOURCE === 'api' ? data : undefined)}>
              Export JSON
            </Button>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="text-sm font-medium">{DATA_SOURCE === 'api' ? 'Add demo data' : 'Reset sample data'}</div>
            <p className="mt-1 mb-3 text-xs text-muted">
              {DATA_SOURCE === 'api'
                ? 'Adds the server’s sample ledger (4 months of transactions, budgets and 2 goals) to your account. Your existing records are kept.'
                : 'Replace everything with the demo profile (Aarav, ₹65,000/month).'}
            </p>
            <Button
              size="sm"
              icon="refresh"
              onClick={async () => {
                const question = DATA_SOURCE === 'api' ? 'Add the sample ledger to your account? These records are saved on the server.' : 'Replace all data with the sample dataset?'
                if (confirm(question)) {
                  await resetDemoData()
                  toast.success(DATA_SOURCE === 'api' ? 'Demo data requested - refreshed from the server' : 'Sample data restored')
                }
              }}
            >
              {DATA_SOURCE === 'api' ? 'Add demo data' : 'Reset to sample'}
            </Button>
          </div>
          <div className="rounded-xl border border-danger/30 p-4">
            <div className="text-sm font-medium">Start fresh</div>
            <p className="mt-1 mb-3 text-xs text-muted">
              {DATA_SOURCE === 'api'
                ? 'Not available with the backend yet (there is no bulk-delete endpoint). Delete records individually.'
                : 'Delete all data, including sample data, and start with an empty profile.'}
            </p>
            <Button
              size="sm"
              variant="danger"
              icon="trash"
              disabled={DATA_SOURCE === 'api'}
              onClick={async () => {
                if (confirm('Delete all Finora data in this browser? This cannot be undone.')) {
                  await clearAllData()
                  toast.success('All data cleared')
                }
              }}
            >
              Clear all data
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-sm font-medium">Learned category rules ({data.rules.length})</div>
          {data.rules.length === 0 ? (
            <p className="text-xs text-faint">None yet - correct a transaction's category and tick “Remember” to create one.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <code className="font-mono text-xs">“{r.pattern}”</code>
                  <Icon name="arrowRight" size={12} className="text-faint" />
                  <CategoryBadge category={r.category} />
                  <span className="flex-1" />
                  <Badge>Local only</Badge>
                  <IconButton icon="trash" label="Delete rule" onClick={() => deleteRule(r.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle title="Privacy & safety" icon="lock" />
        <ul className="grid gap-3 text-sm text-muted md:grid-cols-2">
          {[
            ['No bank connection', 'Finora never logs in to or connects with your bank. Data comes only from what you add or import.'],
            [DATA_SOURCE === 'api' ? 'Where data lives' : 'Stored locally', DATA_SOURCE === 'api' ? `Transactions, subscriptions, goals and profile totals are stored on the Finora server (${API_BASE_URL || 'this origin'}). Settings, learned rules and coach history stay in this browser.` : 'Everything is saved in this browser (localStorage). Clearing site data removes it.'],
            ['No secrets in the browser', 'AI and API keys belong on the backend. The frontend never stores or sends them.'],
            ['Education, not advice', 'The coach explains and plans. It does not recommend securities, promise returns or move money.'],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-2.5">
              <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-accent" />
              <span>
                <span className="block font-medium text-fg">{t}</span>
                {d}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <DemoNotice>
            Developer note: the AgentForge hackathon workspace (roadmap, docs, backend agent) is still available at{' '}
            <Link to="/workspace" className="font-medium text-accent hover:underline">
              /workspace
            </Link>
            .
          </DemoNotice>
        </div>
      </Card>
    </div>
  )
}
