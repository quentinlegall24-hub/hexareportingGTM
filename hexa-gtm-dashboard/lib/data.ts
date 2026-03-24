export interface ReportRow {
  startup: string;
  week: string;
  leadsGenerated: number;
  qualificationsHeld: number;
  offersSent: number;
  newCustomers: number;
  newARR: number;
  customersLost: number;
  arrLost: number;
  totalCustomers: number;
  arrStart: number;
  arrEnd: number;
  projectedARR: number;
  type: "weekly" | "monthly";
  status: string;
}
