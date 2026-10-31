// Finora service layer - the only place the UI gets data from.
// Each service works against localStorage today (demo persistence) and has
// its future REST endpoint documented at the top of its file.

export { alertService } from './alertService'
export { buildAnalytics, type AnalyticsData } from './analyticsService'
export { COACH_MODE, DATA_SOURCE } from './config'
export { buildDashboard, type DashboardData } from './dashboardService'
export { demoDataService } from './demoDataService'
export { financeCoachService } from './financeCoachService'
export { financeProfileService } from './financeProfileService'
export { goalService } from './goalService'
export { buildReport, type ReportData } from './reportService'
export { settingsService } from './settingsService'
export { subscriptionService } from './subscriptionService'
export { transactionService } from './transactionService'
