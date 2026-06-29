import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BellRing,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DatabaseZap,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Report } from "../../types";

type SectionKey =
  | "dashboard"
  | "districts"
  | "municipalities"
  | "complaints"
  | "map"
  | "analytics"
  | "departments"
  | "users"
  | "settings";

interface DistrictSummary {
  name: string;
  municipalities: string[];
  complaints: number;
  pending: number;
  resolved: number;
  critical: number;
  officers: number;
  avgResolution: string;
  performance: number;
}

interface MunicipalitySummary {
  name: string;
  district: string;
  complaints: number;
  pending: number;
  officers: number;
  status: string;
}

interface OfficerSummary {
  name: string;
  officerId: string;
  district: string;
  department: string;
  assigned: number;
  resolved: number;
  score: number;
  status: "Active" | "Standby" | "Review";
}

interface UserSummary {
  name: string;
  role: "Citizen" | "Officer" | "Super Admin";
  district?: string;
  reports: number;
  status: "Enabled" | "Disabled";
}

const DISTRICTS: DistrictSummary[] = [
  { name: "Hyderabad", municipalities: ["Gachibowli", "Madhapur", "Secunderabad"], complaints: 128, pending: 18, resolved: 96, critical: 7, officers: 24, avgResolution: "1.8h", performance: 92 },
  { name: "Warangal", municipalities: ["Hanamkonda", "Warangal West"], complaints: 84, pending: 12, resolved: 61, critical: 4, officers: 13, avgResolution: "2.2h", performance: 88 },
  { name: "Karimnagar", municipalities: ["Karimnagar City", "Vemulawada"], complaints: 67, pending: 10, resolved: 50, critical: 3, officers: 11, avgResolution: "2.4h", performance: 86 },
  { name: "Nizamabad", municipalities: ["Nizamabad Urban", "Kamareddy"], complaints: 59, pending: 8, resolved: 44, critical: 2, officers: 10, avgResolution: "2.6h", performance: 84 },
  { name: "Khammam", municipalities: ["Khammam City", "Wyra"], complaints: 72, pending: 9, resolved: 55, critical: 3, officers: 12, avgResolution: "2.1h", performance: 89 },
  { name: "Mahabubnagar", municipalities: ["Mahabubnagar City", "Kollapur"], complaints: 53, pending: 7, resolved: 39, critical: 2, officers: 9, avgResolution: "2.8h", performance: 81 },
];

const MUNICIPALITIES: MunicipalitySummary[] = [
  { name: "Gachibowli", district: "Hyderabad", complaints: 41, pending: 6, officers: 8, status: "Stable" },
  { name: "Madhapur", district: "Hyderabad", complaints: 37, pending: 5, officers: 7, status: "Watch" },
  { name: "Secunderabad", district: "Hyderabad", complaints: 29, pending: 4, officers: 6, status: "Stable" },
  { name: "Hanamkonda", district: "Warangal", complaints: 24, pending: 4, officers: 5, status: "Monitor" },
  { name: "Karimnagar City", district: "Karimnagar", complaints: 19, pending: 3, officers: 4, status: "Stable" },
  { name: "Nizamabad Urban", district: "Nizamabad", complaints: 15, pending: 2, officers: 3, status: "Watch" },
];

const OFFICERS: OfficerSummary[] = [
  { name: "Asha Reddy", officerId: "SO-001", district: "Hyderabad", department: "Roads", assigned: 18, resolved: 15, score: 94, status: "Active" },
  { name: "M. Suresh", officerId: "SO-002", district: "Warangal", department: "Sanitation", assigned: 12, resolved: 10, score: 88, status: "Active" },
  { name: "Nithya Rao", officerId: "SO-003", district: "Karimnagar", department: "Electrical", assigned: 10, resolved: 8, score: 82, status: "Standby" },
  { name: "Iqbal Khan", officerId: "SO-004", district: "Hyderabad", department: "Drainage", assigned: 15, resolved: 12, score: 91, status: "Review" },
];

const USERS: UserSummary[] = [
  { name: "Ravi Kumar", role: "Citizen", district: "Hyderabad", reports: 7, status: "Enabled" },
  { name: "Priya Menon", role: "Officer", district: "Hyderabad", reports: 4, status: "Enabled" },
  { name: "Suresh Iyer", role: "Super Admin", district: "Warangal", reports: 2, status: "Enabled" },
  { name: "Lakshmi Rao", role: "Citizen", district: "Khammam", reports: 11, status: "Disabled" },
];

const DEPARTMENTS = [
  { name: "Road Department", open: 24, resolved: 79, avgResolution: "1.9h", officers: 18, performance: 91 },
  { name: "Sanitation", open: 16, resolved: 63, avgResolution: "2.0h", officers: 14, performance: 87 },
  { name: "Electrical", open: 12, resolved: 46, avgResolution: "2.1h", officers: 10, performance: 84 },
  { name: "Drainage", open: 9, resolved: 38, avgResolution: "2.3h", officers: 8, performance: 82 },
  { name: "Civil Engineering", open: 11, resolved: 52, avgResolution: "2.2h", officers: 9, performance: 86 },
  { name: "Traffic", open: 8, resolved: 41, avgResolution: "2.5h", officers: 7, performance: 80 },
  { name: "Water Supply", open: 14, resolved: 57, avgResolution: "2.0h", officers: 11, performance: 89 },
];

const sectionMeta: Array<{ key: SectionKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "districts", label: "District Management", icon: Building2 },
  { key: "municipalities", label: "Municipalities", icon: MapPin },
  { key: "complaints", label: "Complaints", icon: FileText },
  { key: "map", label: "Live Map", icon: Map },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "departments", label: "Departments", icon: Briefcase },
  { key: "users", label: "Users", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
];

const getSeverityBadgeClass = (sev: string) => {
  switch (sev) {
    case "Critical": return "bg-[#451212] text-[#f87171] border-[#7f1d1d]";
    case "High": return "bg-[#451a1a] text-[#f87171] border-[#7f1d1d]";
    case "Medium": return "bg-[#332212] text-[#fbbf24] border-[#78350f]";
    case "Low": return "bg-[#112233] text-[#60a5fa] border-[#1e3a8a]";
    default: return "bg-[#1a1a1e] text-[#94949e] border-[#26262d]";
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Pending": return "bg-[#2d2212] text-[#fbbf24] border-[#78350f]";
    case "In Progress": return "bg-[#122b3d] text-[#38bdf8] border-[#0369a1]";
    case "Resolved": return "bg-[#142d1e] text-[#34d399] border-[#064e3b]";
    default: return "bg-[#1a1a1e] text-[#94949e] border-[#26262d]";
  }
};

const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictSummary>(DISTRICTS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (error) {
        console.error("Failed to fetch reports for super admin view", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const activeSection = useMemo<SectionKey>(() => {
    const path = location.pathname;
    if (path.includes("/municipalities")) return "municipalities";
    if (path.includes("/complaints")) return "complaints";
    if (path.includes("/map")) return "map";
    if (path.includes("/analytics")) return "analytics";
    if (path.includes("/departments")) return "departments";
    if (path.includes("/users")) return "users";
    if (path.includes("/settings")) return "settings";
    if (path.includes("/districts")) return "districts";
    return "dashboard";
  }, [location.pathname]);

  const totals = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((report) => report.status === "Pending").length;
    const inProgress = reports.filter((report) => report.status === "In Progress").length;
    const resolved = reports.filter((report) => report.status === "Resolved").length;
    const critical = reports.filter((report) => report.severity === "Critical").length;
    const avgResolution = reports.length
      ? Math.round(reports.reduce((sum, report) => sum + (report.resolution_time_minutes || 0), 0) / reports.length)
      : 0;
    return { total, pending, inProgress, resolved, critical, avgResolution };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return reports.filter((report) => {
      const matchesDistrict = districtFilter === "All" || report.district === districtFilter;
      const matchesStatus = statusFilter === "All" || report.status === statusFilter;
      const matchesSeverity = severityFilter === "All" || report.severity === severityFilter;
      const matchesQuery =
        !query ||
        report.issue_category.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        report.district.toLowerCase().includes(query) ||
        report.suggested_department.toLowerCase().includes(query);
      return matchesDistrict && matchesStatus && matchesSeverity && matchesQuery;
    });
  }, [reports, districtFilter, searchQuery, severityFilter, statusFilter]);

  const overviewStats = [
    { label: "Total Complaints", value: totals.total || 248, icon: FileText, tone: "text-[#e1e1e6]", accent: "text-[#38bdf8]" },
    { label: "Total Districts", value: DISTRICTS.length, icon: Building2, tone: "text-[#e1e1e6]", accent: "text-[#fbbf24]" },
    { label: "Total Municipalities", value: MUNICIPALITIES.length, icon: MapPin, tone: "text-[#e1e1e6]", accent: "text-[#34d399]" },
    { label: "Active Officers", value: OFFICERS.filter((officer) => officer.status === "Active").length, icon: Shield, tone: "text-[#e1e1e6]", accent: "text-[#a855f7]" },
    { label: "Critical Issues", value: totals.critical || 12, icon: AlertTriangle, tone: "text-[#f87171]", accent: "text-[#f87171]" },
    { label: "Resolved Today", value: totals.resolved || 134, icon: CheckCircle2, tone: "text-[#34d399]", accent: "text-[#34d399]" },
    { label: "Pending", value: totals.pending + totals.inProgress || 41, icon: Clock, tone: "text-[#fbbf24]", accent: "text-[#fbbf24]" },
    { label: "Avg Resolution Time", value: `${Math.max(1, Math.round((totals.avgResolution || 118) / 60))}h`, icon: TrendingUp, tone: "text-[#38bdf8]", accent: "text-[#38bdf8]" },
  ];

  const departmentPerformance = DEPARTMENTS.slice(0, 4);

  const renderSection = () => {
    switch (activeSection) {
      case "districts":
        return (
          <motion.div key="districts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
              <div className="grid gap-4 md:grid-cols-2">
                {DISTRICTS.map((district) => (
                  <button
                    key={district.name}
                    type="button"
                    onClick={() => setSelectedDistrict(district)}
                    className={`rounded-2xl border p-5 text-left transition-all ${selectedDistrict.name === district.name ? "border-[#38bdf8] bg-[#111b2b]" : "border-[#26262d] bg-[#141417] hover:border-[#38bdf8]/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#e1e1e6]">{district.name}</h3>
                      <span className="text-xs text-[#38bdf8]">{district.performance}%</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#94949e]">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider">Complaints</p>
                        <p className="mt-1 text-xl font-semibold text-[#e1e1e6]">{district.complaints}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider">Pending</p>
                        <p className="mt-1 text-xl font-semibold text-[#fbbf24]">{district.pending}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#71717a]">
                      <span className="rounded-full border border-[#26262d] px-2.5 py-1">{district.officers} officers</span>
                      <span className="rounded-full border border-[#26262d] px-2.5 py-1">{district.avgResolution} avg</span>
                      <span className="rounded-full border border-[#26262d] px-2.5 py-1">{district.critical} critical</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Selected District</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#e1e1e6]">{selectedDistrict.name}</h3>
                  </div>
                  <div className="rounded-full border border-[#38bdf8]/20 bg-[#38bdf8]/10 p-2 text-[#38bdf8]">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    { label: "Complaints", value: selectedDistrict.complaints },
                    { label: "Resolved", value: selectedDistrict.resolved },
                    { label: "Pending", value: selectedDistrict.pending },
                    { label: "Critical", value: selectedDistrict.critical },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-[#26262d] bg-[#141417] px-3 py-3">
                      <span className="text-sm text-[#94949e]">{item.label}</span>
                      <span className="text-sm font-semibold text-[#e1e1e6]">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-[#26262d] bg-[#141417] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Municipalities</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDistrict.municipalities.map((municipality) => (
                      <span key={municipality} className="rounded-full border border-[#26262d] px-2.5 py-1 text-xs text-[#e1e1e6]">{municipality}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Officer Management</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#e1e1e6]">Municipality officers across districts</h3>
                </div>
                <button className="rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2 text-sm font-semibold text-[#e1e1e6]">Create Officer</button>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#26262d] text-left text-[#94949e]">
                      <th className="pb-3 pr-4">Officer</th>
                      <th className="pb-3 pr-4">District</th>
                      <th className="pb-3 pr-4">Department</th>
                      <th className="pb-3 pr-4">Assigned</th>
                      <th className="pb-3 pr-4">Resolved</th>
                      <th className="pb-3 pr-4">Score</th>
                      <th className="pb-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OFFICERS.map((officer) => (
                      <tr key={officer.officerId} className="border-b border-[#1c1c22] text-[#e1e1e6]">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-semibold">{officer.name}</p>
                            <p className="text-xs text-[#94949e]">{officer.officerId}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{officer.district}</td>
                        <td className="py-3 pr-4">{officer.department}</td>
                        <td className="py-3 pr-4">{officer.assigned}</td>
                        <td className="py-3 pr-4">{officer.resolved}</td>
                        <td className="py-3 pr-4">{officer.score}%</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <button className="rounded-lg border border-[#26262d] px-2.5 py-1 text-xs">Edit</button>
                            <button className="rounded-lg border border-[#26262d] px-2.5 py-1 text-xs">Transfer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        );
      case "municipalities":
        return (
          <motion.div key="municipalities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {MUNICIPALITIES.map((municipality) => (
                <div key={municipality.name} className="rounded-3xl border border-[#26262d] bg-[#111114] p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#e1e1e6]">{municipality.name}</h3>
                    <span className="rounded-full border border-[#26262d] px-2.5 py-1 text-xs text-[#94949e]">{municipality.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#94949e]">{municipality.district}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-[#26262d] bg-[#141417] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[#94949e]">Complaints</p>
                      <p className="mt-1 text-xl font-semibold text-[#e1e1e6]">{municipality.complaints}</p>
                    </div>
                    <div className="rounded-xl border border-[#26262d] bg-[#141417] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[#94949e]">Officers</p>
                      <p className="mt-1 text-xl font-semibold text-[#38bdf8]">{municipality.officers}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-[#26262d] bg-[#141417] px-3 py-3 text-sm text-[#94949e]">
                    <span>Pending</span>
                    <span className="font-semibold text-[#fbbf24]">{municipality.pending}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      case "complaints":
        return (
          <motion.div key="complaints" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label className="space-y-1.5 text-sm text-[#94949e]">
                  <span className="text-[11px] uppercase tracking-wider">Search</span>
                  <div className="flex items-center rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2">
                    <Search className="mr-2 h-4 w-4 text-[#94949e]" />
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#e1e1e6] outline-none" placeholder="Search complaints" />
                  </div>
                </label>
                <label className="space-y-1.5 text-sm text-[#94949e]">
                  <span className="text-[11px] uppercase tracking-wider">District</span>
                  <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="w-full rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2 text-sm text-[#e1e1e6]">
                    <option value="All">All</option>
                    {DISTRICTS.map((district) => <option key={district.name} value={district.name}>{district.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[#94949e]">
                  <span className="text-[11px] uppercase tracking-wider">Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2 text-sm text-[#e1e1e6]">
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[#94949e]">
                  <span className="text-[11px] uppercase tracking-wider">Severity</span>
                  <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="w-full rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2 text-sm text-[#e1e1e6]">
                    <option value="All">All</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
                <div className="rounded-xl border border-[#26262d] bg-[#141417] p-3 text-sm text-[#94949e]">
                  <p className="text-[11px] uppercase tracking-wider">Visible</p>
                  <p className="mt-2 text-xl font-semibold text-[#e1e1e6]">{filteredReports.length}</p>
                </div>
                <div className="rounded-xl border border-[#26262d] bg-[#141417] p-3 text-sm text-[#94949e]">
                  <p className="text-[11px] uppercase tracking-wider">Export</p>
                  <button className="mt-2 rounded-lg border border-[#26262d] px-3 py-2 text-sm font-semibold text-[#e1e1e6]">Export Report</button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-3xl border border-[#26262d] bg-[#111114]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#26262d] text-left text-[#94949e]">
                    <th className="px-4 py-3">Issue</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.slice(0, 8).map((report) => (
                    <tr key={report.report_id} className="border-b border-[#1c1c22] text-[#e1e1e6]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold">{report.issue_category}</p>
                          <p className="text-xs text-[#94949e]">{report.description.slice(0, 72)}...</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{report.district}</td>
                      <td className="px-4 py-3">{report.suggested_department}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${getSeverityBadgeClass(report.severity)}`}>{report.severity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${getStatusBadgeClass(report.status)}`}>{report.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[#94949e]">{new Date(report.upload_timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      case "map":
        return (
          <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-4">
              <div className="mb-4 flex flex-wrap gap-3">
                {[
                  { label: "District", value: "All" },
                  { label: "Department", value: "All" },
                  { label: "Officer", value: "All" },
                  { label: "Status", value: "All" },
                  { label: "Date", value: "All" },
                  { label: "Issue Type", value: "All" },
                ].map((filter) => (
                  <div key={filter.label} className="rounded-full border border-[#26262d] px-3 py-2 text-sm text-[#94949e]">{filter.label}: {filter.value}</div>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-[#26262d] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),linear-gradient(135deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.0))] p-8">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="relative mx-auto flex h-[420px] max-w-4xl items-center justify-center">
                  <div className="absolute h-64 w-64 rounded-full border border-[#38bdf8]/20" />
                  <div className="absolute h-44 w-44 rounded-full border border-[#fbbf24]/20" />
                  <div className="absolute h-28 w-28 rounded-full border border-[#34d399]/20" />
                  {[
                    { left: "20%", top: "32%", color: "bg-[#f87171]" },
                    { left: "45%", top: "28%", color: "bg-[#fb923c]" },
                    { left: "60%", top: "52%", color: "bg-[#fbbf24]" },
                    { left: "32%", top: "65%", color: "bg-[#34d399]" },
                    { left: "70%", top: "30%", color: "bg-[#60a5fa]" },
                  ].map((marker, index) => (
                    <div key={index} className={`absolute ${marker.color} h-4 w-4 rounded-full shadow-lg`} style={{ left: marker.left, top: marker.top }} />
                  ))}
                  <div className="rounded-2xl border border-[#26262d] bg-[#141417]/90 px-4 py-3 text-sm text-[#94949e] backdrop-blur">
                    State-wide complaint clusters • {reports.length} active references
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case "analytics":
        return (
          <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Complaints by District</p>
                <div className="mt-5 space-y-3">
                  {DISTRICTS.slice(0, 5).map((district) => (
                    <div key={district.name}>
                      <div className="mb-1 flex items-center justify-between text-sm text-[#94949e]">
                        <span>{district.name}</span>
                        <span className="text-[#e1e1e6]">{district.complaints}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1f1f24]">
                        <div className="h-2 rounded-full bg-[#38bdf8]" style={{ width: `${Math.min((district.complaints / 150) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Department Performance</p>
                <div className="mt-5 space-y-3">
                  {DEPARTMENTS.slice(0, 5).map((department) => (
                    <div key={department.name}>
                      <div className="mb-1 flex items-center justify-between text-sm text-[#94949e]">
                        <span>{department.name}</span>
                        <span className="text-[#e1e1e6]">{department.performance}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1f1f24]">
                        <div className="h-2 rounded-full bg-[#34d399]" style={{ width: `${department.performance}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">AI Detection Statistics</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[
                    { label: "Detection Accuracy", value: "95.2%" },
                    { label: "Auto Routing", value: "91%" },
                    { label: "False Positives", value: "4.8%" },
                    { label: "Repeat Areas", value: "14" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#26262d] bg-[#141417] p-3">
                      <p className="text-sm text-[#94949e]">{item.label}</p>
                      <p className="mt-1 text-xl font-semibold text-[#e1e1e6]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Repeat Complaint Areas</p>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Madhapur", incidents: 18 },
                    { name: "Secunderabad", incidents: 14 },
                    { name: "Hanamkonda", incidents: 11 },
                  ].map((area) => (
                    <div key={area.name} className="flex items-center justify-between rounded-xl border border-[#26262d] bg-[#141417] px-3 py-3 text-sm text-[#94949e]">
                      <span>{area.name}</span>
                      <span className="font-semibold text-[#fbbf24]">{area.incidents} incidents</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case "departments":
        return (
          <motion.div key="departments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DEPARTMENTS.map((department) => (
              <div key={department.name} className="rounded-3xl border border-[#26262d] bg-[#111114] p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#e1e1e6]">{department.name}</h3>
                  <span className="rounded-full border border-[#26262d] px-2.5 py-1 text-xs text-[#94949e]">{department.performance}%</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-xl border border-[#26262d] bg-[#141417] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-[#94949e]">Open Cases</p>
                    <p className="mt-1 text-xl font-semibold text-[#fbbf24]">{department.open}</p>
                  </div>
                  <div className="rounded-xl border border-[#26262d] bg-[#141417] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-[#94949e]">Resolved</p>
                    <p className="mt-1 text-xl font-semibold text-[#34d399]">{department.resolved}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-[#94949e]">
                  <span>Avg Resolution</span>
                  <span className="font-semibold text-[#e1e1e6]">{department.avgResolution}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-[#94949e]">
                  <span>Officer Count</span>
                  <span className="font-semibold text-[#38bdf8]">{department.officers}</span>
                </div>
              </div>
            ))}
          </motion.div>
        );
      case "users":
        return (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">User Administration</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#e1e1e6]">Citizens, municipality officers, and admins</h3>
                </div>
                <div className="rounded-full border border-[#26262d] bg-[#141417] px-3 py-2 text-sm text-[#94949e]">Search • Disable • Enable • Reports</div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-3xl border border-[#26262d] bg-[#111114]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#26262d] text-left text-[#94949e]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Reports</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {USERS.map((userEntry) => (
                    <tr key={userEntry.name} className="border-b border-[#1c1c22] text-[#e1e1e6]">
                      <td className="px-4 py-3 font-semibold">{userEntry.name}</td>
                      <td className="px-4 py-3">{userEntry.role}</td>
                      <td className="px-4 py-3">{userEntry.district}</td>
                      <td className="px-4 py-3">{userEntry.reports}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${userEntry.status === "Enabled" ? "border-[#34d399]/20 bg-[#142d1e] text-[#34d399]" : "border-[#f87171]/20 bg-[#451212] text-[#f87171]"}`}>{userEntry.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="rounded-lg border border-[#26262d] px-2.5 py-1 text-xs">View Reports</button>
                          <button className="rounded-lg border border-[#26262d] px-2.5 py-1 text-xs">Toggle</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      case "settings":
        return (
          <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-2">
            {[
              { title: "System Configuration", description: "Governance policy, regional thresholds, and platform settings.", icon: Settings },
              { title: "AI Settings", description: "Model confidence, auto-routing, and detection thresholds.", icon: Sparkles },
              { title: "Department Mapping", description: "Route issue categories to the appropriate departments.", icon: DatabaseZap },
              { title: "Notification Settings", description: "Alerts for critical incidents, escalations and weekly summaries.", icon: BellRing },
              { title: "Application Logs", description: "Audit trail for portal actions, exports and officer updates.", icon: Activity },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#26262d] bg-[#141417] p-2 text-[#38bdf8]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#e1e1e6]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#94949e]">{item.description}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-[#26262d] bg-[#141417] p-4">
                  <div className="flex items-center justify-between text-sm text-[#94949e]">
                    <span>Current State</span>
                    <span className="font-semibold text-[#34d399]">Operational</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[#94949e]">
                    <span>Last Sync</span>
                    <span className="font-semibold text-[#e1e1e6]">Just Now</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        );
      case "dashboard":
      default:
        return (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-[#26262d] bg-[#111114] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94949e]">{stat.label}</span>
                      <Icon className={`h-4 w-4 ${stat.accent}`} />
                    </div>
                    <p className={`mt-3 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Department Performance</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#e1e1e6]">State command overview</h3>
                  </div>
                  <div className="rounded-full border border-[#26262d] bg-[#141417] px-3 py-2 text-sm text-[#94949e]">Live sync</div>
                </div>
                <div className="mt-6 space-y-3">
                  {departmentPerformance.map((department) => (
                    <div key={department.name}>
                      <div className="mb-1 flex items-center justify-between text-sm text-[#94949e]">
                        <span>{department.name}</span>
                        <span className="text-[#e1e1e6]">{department.performance}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1f1f24]">
                        <div className="h-2 rounded-full bg-[#38bdf8]" style={{ width: `${department.performance}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Command Center</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#e1e1e6]">Executive watchlist</h3>
                  </div>
                  <div className="rounded-2xl border border-[#26262d] bg-[#141417] p-2 text-[#fbbf24]">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {[
                    { title: "High-priority escalations", value: "7" },
                    { title: "Departments requiring review", value: "3" },
                    { title: "Municipalities under watch", value: "2" },
                    { title: "AI routing confidence", value: "95%" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center justify-between rounded-xl border border-[#26262d] bg-[#141417] px-3 py-3 text-sm text-[#94949e]">
                      <span>{item.title}</span>
                      <span className="font-semibold text-[#e1e1e6]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">District Delivery</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#e1e1e6]">Executive district snapshot</h3>
                </div>
                <button className="rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2 text-sm font-semibold text-[#e1e1e6]">Generate Report</button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {DISTRICTS.map((district) => (
                  <div key={district.name} className="rounded-2xl border border-[#26262d] bg-[#141417] p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-[#e1e1e6]">{district.name}</h4>
                      <span className="text-sm text-[#38bdf8]">{district.performance}%</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-[#94949e]">
                      <span>Complaints</span>
                      <span className="font-semibold text-[#e1e1e6]">{district.complaints}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-[#94949e]">
                      <span>Resolved</span>
                      <span className="font-semibold text-[#34d399]">{district.resolved}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-[#94949e]">
                      <span>Critical</span>
                      <span className="font-semibold text-[#f87171]">{district.critical}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e1e1e6] antialiased">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className={`${sidebarOpen ? "w-72" : "w-20"} hidden border-r border-[#1e1e24] bg-[#0e0e11] lg:flex lg:flex-col`}>
          <div className="flex h-16 items-center justify-between border-b border-[#1e1e24] px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#38bdf8]/15 p-2 text-[#38bdf8]">
                <Shield className="h-5 w-5" />
              </div>
              {sidebarOpen && (
                <div>
                  <p className="text-sm font-semibold text-[#e1e1e6]">CivicLens</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#38bdf8]">State Command Center</p>
                </div>
              )}
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg border border-[#26262d] p-1.5 text-[#94949e] hover:text-[#e1e1e6]">
              <LayoutDashboard className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-4">
            <div className="rounded-2xl border border-[#26262d] bg-[#141417] p-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#38bdf8]/15 p-2 text-[#38bdf8]">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                {sidebarOpen && (
                  <div>
                    <p className="text-sm font-semibold text-[#e1e1e6]">{user?.id || "Super Admin"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[#94949e]">State Government</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2">
            {sectionMeta.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(`/superadmin/${item.key === "dashboard" ? "dashboard" : item.key}`)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${isActive ? "border border-[#38bdf8]/20 bg-[#38bdf8]/10 text-[#38bdf8]" : "text-[#94949e] hover:bg-[#18181c] hover:text-[#e1e1e6]"}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-[#1e1e24] p-3">
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#94949e] transition-all hover:bg-[#451212]/40 hover:text-[#f87171]">
              <LogOut className="h-4.5 w-4.5" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-[#1e1e24] bg-[#0e0e11] px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#94949e]">Government Command Center</p>
                <h1 className="text-xl font-semibold text-[#e1e1e6]">{activeSection === "dashboard" ? "Platform Overview" : sectionMeta.find((section) => section.key === activeSection)?.label}</h1>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 rounded-xl border border-[#26262d] bg-[#141417] px-3 py-2 text-sm text-[#94949e]">
                  <RefreshCw className="h-4 w-4" />
                  Sync Data
                </button>
                <div className="rounded-2xl border border-[#26262d] bg-[#141417] p-2 text-[#38bdf8]">
                  <Shield className="h-5 w-5" />
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6">
            {loading ? (
              <div className="rounded-3xl border border-[#26262d] bg-[#111114] p-8 text-center text-[#94949e]">
                Loading state-wide data...
              </div>
            ) : (
              <AnimatePresence mode="wait">{renderSection()}</AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
