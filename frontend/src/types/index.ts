export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone_number: string;
  avatar_color: string;
  role: "lessee" | "admin" | "analyst";
  created_at: string;
}

export interface Asset {
  id: number;
  name: string;
  category: "heavy_equipment" | "medical" | "fleet" | "industrial";
  serial_number: string;
  manufacture_year: number;
  base_monthly_rate: string;
  per_hour_rate: string;
  status: "available" | "leased" | "maintenance" | "remarketed";
  image_url?: string;
  total_hours_logged: number;
}

export interface LeaseContract {
  id: number;
  asset: number;
  lessee: number;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_base_fee: string;
  per_hour_rate: string;
  status: "pending" | "active" | "completed" | "defaulted";
  document_url?: string | null;
  created_at: string;
  asset_detail?: Asset;
  lessee_detail?: User;
}

export interface UsageLog {
  id: number;
  asset: number;
  lease: number;
  timestamp: string;
  hours_used: number;
  latitude: number;
  longitude: number;
  engine_temp_celsius: number;
  fuel_level_percent: number;
}

export interface Invoice {
  id: number;
  lease: number;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  base_fee: string;
  usage_fee: string;
  total_amount: string;
  status: "draft" | "issued" | "paid" | "overdue";
  issued_at: string;
  due_date: string;
  lease_detail?: LeaseContract;
}

export interface ValuationResult {
  asset_id: number;
  asset_name: string;
  category: string;
  serial_number: string;
  predicted_resale_value: number;
  confidence_low: number;
  confidence_high: number;
  original_value: number;
  retention_ratio: number;   // percentage, e.g. 65.0 = 65%
  asset_age_years: number;
  total_hours: number;
  maintenance_events: number;
  recommendation: "REMARKET NOW" | "HOLD 6 MONTHS" | "SCHEDULE MAINTENANCE";
  recommendation_color: "success" | "warning" | "danger";
}

export interface BatchValuationResponse {
  total_portfolio_value: number;
  avg_retention_ratio: number;   // percentage
  asset_count: number;
  results: ValuationResult[];
}

export interface DepreciationForecastItem {
  asset_id: number;
  asset_name: string;
  category: string;
  current_value: number;
  recommendation: string;
  recommendation_color: string;
  retention_ratio: number;
  forecast: { label: string; value: number }[];
}

export interface DepreciationForecastResponse {
  forecasts: DepreciationForecastItem[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AssetHealth {
  latest: {
    engine_temp_celsius: number;
    fuel_level_percent: number;
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  stats_30d: {
    avg_engine_temp: number | null;
    max_engine_temp: number | null;
    min_engine_temp: number | null;
    avg_fuel_level: number | null;
    total_hours: number | null;
  };
}

export interface TelemetryDay {
  date: string;
  heavy_equipment: number;
  medical: number;
  fleet: number;
  industrial: number;
  total: number;
}

export interface DashboardSummary {
  active_leases_count: number;
  total_assets_count: number;
  overdue_invoices_count: number;
  monthly_revenue: number;
  fleet_status: {
    available: number;
    leased: number;
    maintenance: number;
    remarketed: number;
  };
  telemetry_30d: TelemetryDay[];
  total_hours_30d: number;
  upcoming_expirations: {
    id: number;
    contract_number: string;
    end_date: string;
    days_left: number;
    asset_name: string;
    asset_id: number;
    lessee_company: string;
  }[];
  recent_invoices: Invoice[];
  monthly_revenue_breakdown: { month: string; revenue: number }[];
}

export interface Notification {
  id: string;
  type: "overdue_invoice" | "lease_expiring" | "high_temp";
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  resource_id: number;
  resource_type: "invoice" | "lease" | "asset";
}

export interface NotificationsResponse {
  count: number;
  items: Notification[];
}

export interface MaintenanceLog {
  id: number;
  asset: number;
  logged_by: number | null;
  logged_by_username: string;
  notes: string;
  priority: "low" | "medium" | "high" | "critical";
  start_date: string;
  resolved_date: string | null;
  resolved: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  description: string;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AuditLogResponse {
  count: number;
  page: number;
  page_size: number;
  results: AuditLog[];
}

// ── Feature 1: Approval Workflow ──────────────────────────────

export type ApprovalRequestType =
  | "lease_renew"
  | "lease_terminate"
  | "lease_discount"
  | "write_off"
  | "asset_disposal"
  | "lease_create";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";

export interface ApprovalRequest {
  id: number;
  request_number: string;
  request_type: ApprovalRequestType;
  request_type_display: string;
  status: ApprovalStatus;
  priority: "low" | "medium" | "high" | "urgent";
  requested_by: number;
  requested_by_username: string;
  requested_by_name: string;
  reviewed_by: number | null;
  reviewed_by_username: string | null;
  resource_type: string;
  resource_id: number | null;
  payload: Record<string, unknown>;
  requester_notes: string;
  reviewer_notes: string;
  created_at: string;
  reviewed_at: string | null;
  expires_at: string | null;
}

export interface ApprovalStats {
  by_status: Record<string, number>;
  pending_by_type: Record<string, number>;
  total_pending: number;
}

// ── Feature 2: Payments ───────────────────────────────────────

export interface PaymentRecord {
  id: number;
  payment_ref: string;
  invoice: number;
  invoice_number: string;
  amount: string;
  payment_method: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  external_ref: string;
  initiated_by: number | null;
  initiated_by_username: string | null;
  notes: string;
  created_at: string;
  completed_at: string | null;
}

export interface DunningRule {
  id: number;
  name: string;
  days_overdue: number;
  action: "email" | "sms" | "suspend" | "flag";
  message_template: string;
  active: boolean;
  order: number;
}

export interface ReconciliationReport {
  id: number;
  period_start: string;
  period_end: string;
  total_invoiced: string;
  total_received: string;
  total_outstanding: string;
  total_overdue: string;
  invoice_count: number;
  paid_count: number;
  overdue_count: number;
  status: "draft" | "reconciled" | "discrepancy";
  generated_by: number | null;
  generated_by_username: string | null;
  generated_at: string;
  notes: string;
}

// ── Feature 3: Communications / In-App Notifications ─────────

export interface InAppNotification {
  id: number;
  title: string;
  body: string;
  notification_type: string;
  severity: "info" | "success" | "warning" | "error";
  resource_type: string;
  resource_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ── Feature 4: SLA Ticketing ──────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "pending_parts" | "resolved" | "escalated" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface ServiceTicket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  asset: number;
  asset_name: string;
  reported_by: number | null;
  reported_by_username: string | null;
  assigned_to: number | null;
  assigned_to_username: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  sla_hours_total: number;
  resolution_notes: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketStats {
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  sla_breached: number;
}

// ── Feature 7: Webhooks ───────────────────────────────────────

export interface WebhookSubscription {
  id: number;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  failure_count: number;
}

// ── Feature 8: Pricing Rules ──────────────────────────────────

export interface PricingRule {
  id: number;
  name: string;
  rule_type: string;
  rule_type_display: string;
  asset_category: string;
  active: boolean;
  params: Record<string, unknown>;
  description: string;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
}

// ── Feature 9: Portfolio Risk ─────────────────────────────────

export interface PortfolioRisk {
  default_risk: {
    rate: number;
    overdue_lessees: number;
    total_lessees: number;
    overdue_amount: number;
    avg_days_overdue: number;
  };
  utilization_risk: {
    under_utilized_count: number;
    over_utilized_count: number;
    assets: {
      asset_id: number;
      asset_name: string;
      category: string;
      utilization_pct: number;
      hours_30d: number;
      risk: "under" | "normal" | "over";
    }[];
  };
  concentration_risk: {
    hhi: number;
    hhi_label: "Low" | "Moderate" | "High";
    top_lessees: { lessee: string; monthly_arr: number; share_pct: number }[];
    by_category: Record<string, number>;
  };
  revenue_at_risk: {
    expiring_90d_count: number;
    expiring_90d_arr: number;
    defaulted_arr: number;
    total_active_arr: number;
  };
  early_warning_signals: {
    type: string;
    severity: "critical" | "warning" | "info";
    message: string;
  }[];
}

// ── Feature 6: Contract Analysis ─────────────────────────────

export interface ContractAnalysis {
  id: number;
  lease: number;
  status: "pending" | "processing" | "completed" | "failed";
  extracted_data: Record<string, unknown>;
  validation_issues: {
    field: string;
    stored: string;
    extracted: unknown;
    severity: "info" | "warning" | "error";
    message: string;
  }[];
  confidence_score: number | null;
  pages_analyzed: number;
  analyzed_at: string | null;
  error_message: string;
}
