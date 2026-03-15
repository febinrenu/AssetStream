// ── AI Engine TypeScript Types ───────────────────────────────────────────────

// Feature 1: Lease Structuring Copilot
export interface CopilotAlternative {
  term_months: number;
  monthly_rate: number;
  residual_value: number;
  rate_multiplier: number;
}

export interface LeaseCopilotResult {
  recommended_term_months: number;
  rate_multiplier: number;
  suggested_monthly_rate: number;
  deposit_percent: number;
  residual_value: number;
  lessee_credit_score: number;
  asset_retention_ratio: number;
  risk_appetite: "conservative" | "balanced" | "aggressive";
  risk_flags: string[];
  rationale: string;
  alternatives: CopilotAlternative[];
  asset_name: string;
  lessee_name: string;
}

// Feature 2: Invoice Anomaly Detection
export type AnomalyAlertType = "spike" | "duplicate" | "zero_usage" | "outlier" | "dormant";
export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface AnomalyAlert {
  id: number;
  invoice_id: number;
  invoice_number: string;
  lease_id: number;
  asset_name: string;
  alert_type: AnomalyAlertType;
  severity: AnomalySeverity;
  anomaly_score: number;
  z_score: number | null;
  explanation: string;
  resolved: boolean;
  detected_at: string;
  resolved_at: string | null;
}

export interface AnomalyListResponse {
  count: number;
  unresolved_count: number;
  results: AnomalyAlert[];
}

export interface AnomalyScanResult {
  new_alerts_created: number;
  total_unresolved: number;
  detail: string;
}

// Feature 3: Default Risk Scoring
export type RiskBand = "low" | "medium" | "high" | "critical";

export interface RiskDriver {
  factor: string;
  key: string;
  impact: number;
  direction: "increase" | "decrease";
  value: number | string;
}

export interface AIRiskScore {
  id: number;
  lease_id: number;
  contract_number: string;
  asset_name: string;
  lessee_name: string;
  probability: number;
  risk_band: RiskBand;
  top_drivers: RiskDriver[];
  scored_at: string;
}

export interface RiskScoreListResponse {
  count: number;
  results: AIRiskScore[];
}

export interface RiskRefreshResult {
  leases_scored: number;
  detail: string;
}

// Feature 4: Maintenance Failure Prediction
export type MaintenanceRiskLevel = "safe" | "watch" | "alert" | "critical";

export interface MaintenanceSignal {
  signal: string;
  value: number | string;
  weight: number;
}

export interface MaintenancePrediction {
  id: number;
  asset_id: number;
  asset_name: string;
  category: string;
  failure_probability: number;
  days_to_predicted_failure: number | null;
  risk_level: MaintenanceRiskLevel;
  top_signals: MaintenanceSignal[];
  recommendation: string;
  predicted_at: string;
}

export interface MaintenanceListResponse {
  critical_count: number;
  count: number;
  results: MaintenancePrediction[];
}

export interface MaintenanceRefreshResult {
  assets_analyzed: number;
  detail: string;
}

// Feature 6: AI Collections Assistant
export interface CollectionsItem {
  invoice_id: number;
  invoice_number: string;
  lease_id: number;
  lessee_name: string;
  asset_name: string;
  total_amount: number;
  days_overdue: number;
  urgency_score: number;
  nba_action: string;
  nba_rationale: string;
  draft_subject: string;
  draft_body: string;
}

export interface CollectionsListResponse {
  total_overdue: number;
  total_amount: number;
  results: CollectionsItem[];
}

// Feature 7: Remarketing Decision Engine
export type RemarketingAction = "hold" | "sell_now" | "refurbish" | "re_lease";

export interface RoiPoint {
  month: string;
  roi: number;
  cumulative_value: number;
}

export interface AIRemarketingRecommendation {
  id: number;
  asset_id: number;
  asset_name: string;
  category: string;
  recommended_action: RemarketingAction;
  sell_price_estimate: number;
  refurbish_cost_estimate: number;
  net_roi_12m: number;
  roi_curve: RoiPoint[];
  rationale: string;
  computed_at: string;
  all_roi_curves?: Record<string, RoiPoint[]>;
  final_rois?: Record<string, number>;
}

export interface RemarketingListResponse {
  count: number;
  by_action: Record<string, number>;
  results: AIRemarketingRecommendation[];
}

export interface RemarketingRefreshResult {
  assets_analyzed: number;
  detail: string;
}

// Feature 8: NL Analytics Chat
export interface ChartData {
  type: string | null;
  data: Record<string, unknown> | null;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  intent: string;
  chart_data: ChartData | null;
  timestamp: string;
}

export interface ChatResponse {
  session_id: number;
  message: ChatMessage;
  example_questions: string[];
}

export interface ChatHistoryResponse {
  session_id: number | null;
  messages: ChatMessage[];
  example_questions: string[];
}

// Feature 9: Scenario Simulator
export interface SimulationMonth {
  month: string;
  revenue: number;
  cashflow: number;
  cumulative: number;
  default_loss: number;
  new_income: number;
}

export interface SimulationSummary {
  total_revenue: number;
  total_cashflow: number;
  break_even_month: number | null;
  max_monthly_revenue: number;
  baseline_12m_revenue: number;
  delta_vs_baseline_pct: number;
  current_monthly_arr: number;
}

export interface SimulationResult {
  monthly: SimulationMonth[];
  summary: SimulationSummary;
}

export interface SimulationParams {
  utilization_change_pct: number;
  monthly_rate_change_pct: number;
  default_rate_override: number;
  new_lease_count: number;
  simulation_months: number;
}

// Feature 10: Portfolio Scan
export interface PortfolioScanResult {
  detail: string;
}
