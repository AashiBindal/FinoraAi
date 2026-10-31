// Finora AI data model. These interfaces are the contract between the UI and
// the data layer (src/services). When the backend is built, its JSON should
// match these shapes so only the service implementations need to change.

/** ISO date "YYYY-MM-DD" */
export type ISODate = string
/** Month key "YYYY-MM" */
export type MonthKey = string

export type CategoryId =
  | 'food'
  | 'shopping'
  | 'transport'
  | 'housing'
  | 'bills'
  | 'healthcare'
  | 'education'
  | 'entertainment'
  | 'salary'
  | 'investments'
  | 'other'

export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking' | 'Auto-debit' | 'Cash' | 'Other'
export type TransactionSource = 'sample' | 'manual' | 'csv' | 'sms' | 'pdf'

export interface Transaction {
  id: string
  date: ISODate
  description: string
  /** Normalised merchant / counterparty name used for rule matching */
  merchant: string
  /** Always positive; `type` decides the direction */
  amount: number
  type: TransactionType
  category: CategoryId
  paymentMethod: PaymentMethod
  notes?: string
  source: TransactionSource
  /** True for bundled demo data. The UI labels these as sample data. */
  isSample: boolean
  /** Linked subscription, when the payment is a recurring one */
  subscriptionId?: string
  /** Set when a learned rule assigned the category */
  ruleId?: string
}
export type TransactionInput = Omit<Transaction, 'id' | 'isSample' | 'source'> & { source?: TransactionSource }

/** A user correction the app should remember ("correction learning"). */
export interface CategoryRule {
  id: string
  /** Case-insensitive text matched against merchant + description */
  pattern: string
  category: CategoryId
  createdAt: string
  /** 'local' until a backend learning service has accepted it */
  syncStatus: 'local' | 'synced'
  timesApplied: number
}

export type BillingFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'
/** Self-reported by the user. Finora does not track real usage. */
export type UsageLevel = 'often' | 'sometimes' | 'rarely' | 'unknown'

export interface Subscription {
  id: string
  name: string
  category: CategoryId
  amount: number
  frequency: BillingFrequency
  /** First billing date; next/last payment dates are derived from it */
  billingStartDate: ISODate
  status: SubscriptionStatus
  /** Previous price, if it changed - powers price-increase alerts */
  previousAmount?: number
  usage: UsageLevel
  paymentMethod: PaymentMethod
  notes?: string
  isSample: boolean
}
export type SubscriptionInput = Omit<Subscription, 'id' | 'isSample'>

export interface IncomeSource {
  id: string
  name: string
  amount: number
  kind: 'salary' | 'freelance' | 'rental' | 'other'
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  category: CategoryId
}

export interface FinancialPreferences {
  /** Target share of income to save each month, in % */
  savingsRateTarget: number
  /** Months of essential expenses to hold as an emergency fund */
  emergencyFundMonths: number
  avoidNewDebt: boolean
  prioritiseEmergencyFund: boolean
  /** Minimum balance the user never wants to dip below */
  minimumBalance: number
  /** Free-text constraints, one per line, e.g. "Send ₹5,000 to parents monthly" */
  constraints: string
}

export interface MoneyProfile {
  name: string
  email: string
  city: string
  incomeSources: IncomeSource[]
  fixedExpenses: FixedExpense[]
  /** Monthly budget per variable category */
  variableBudgets: Partial<Record<CategoryId, number>>
  emergencyFund: number
  /** Liquid savings excluding the emergency fund */
  savingsBalance: number
  preferences: FinancialPreferences
  isSample: boolean
  updatedAt: string
}

export type GoalKind = 'emergency' | 'purchase' | 'education' | 'travel' | 'home' | 'other'

export interface Goal {
  id: string
  name: string
  kind: GoalKind
  targetAmount: number
  savedAmount: number
  targetDate: ISODate
  monthlyContribution: number
  createdAt: string
  isSample: boolean
}
export type GoalInput = Omit<Goal, 'id' | 'createdAt' | 'isSample'>

export type AlertSeverity = 'high' | 'medium' | 'low' | 'info'
export type AlertType =
  | 'overspending'
  | 'bill_increase'
  | 'goal_behind'
  | 'upcoming_payment'
  | 'low_savings'
  | 'price_increase'
  | 'unused_subscription'
  | 'budget_utilization'

export interface FinanceAlert {
  /** Deterministic id so read/unread state survives recalculation */
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  date: ISODate
  suggestedAction: string
  /** Optional in-app route for the suggested action */
  actionHref?: string
  read: boolean
}

export interface CoachInsightCard {
  title: string
  rows: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger' | 'neutral' }[]
  footnote?: string
}

export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  cards?: CoachInsightCard[]
  /** 'demo' = rule-based local response; 'ai' = produced by a connected model */
  source?: 'demo' | 'ai'
  followUps?: string[]
  error?: boolean
}

export interface AppSettings {
  currency: 'INR'
  locale: 'en-IN'
  notifications: Record<AlertType, boolean>
  /** Warn when a category reaches this % of its budget */
  budgetWarningThreshold: number
  coach: {
    responseStyle: 'concise' | 'detailed'
    showCalculations: boolean
  }
}

/** Monthly totals derived from transactions */
export interface MonthSummary {
  month: MonthKey
  income: number
  expenses: number
  savings: number
  /** savings / income in %, 0 when no income */
  savingsRate: number
  byCategory: Partial<Record<CategoryId, number>>
  transactionCount: number
}

/** Everything the derived services (dashboard, analytics, report, coach) read. */
export interface FinanceSnapshot {
  transactions: Transaction[]
  subscriptions: Subscription[]
  goals: Goal[]
  profile: MoneyProfile
  settings: AppSettings
  rules: CategoryRule[]
}
