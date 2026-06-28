export interface Report {
  report_id: string;
  image_path: string;
  upload_timestamp: string;
  issue_category: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  suggested_department: string;
  gemini_response: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  address?: string;
  lat?: number;
  lng?: number;
}

export type FilterSeverity = 'All' | 'Low' | 'Medium' | 'High' | 'Critical';
export type FilterStatus = 'All' | 'Pending' | 'In Progress' | 'Resolved';
export type TabType = 'dashboard' | 'report' | 'list' | 'map';
