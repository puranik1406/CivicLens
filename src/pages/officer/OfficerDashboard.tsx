import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Map as MapIcon,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Report } from "../../types";

type OfficerView = "dashboard" | "complaints" | "map" | "analytics" | "departments" | "profile" | "settings";

type OfficerFilterState = {
  search: string;
  severity: "All" | "Low" | "Medium" | "High" | "Critical";
  status: "All" | "Pending" | "In Progress" | "Resolved";
  issue: string;
  ward: string;
  department: string;
  date: string;
};

const navItems: Array<{ id: OfficerView; label: string; icon: React.ElementType }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "complaints", label: "Complaints", icon: ListChecks },
  { id: "map", label: "Live Map", icon: MapIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const departmentOptions = [
  "Roads",
  "Sanitation",
  "Electrical",
  "Drainage",
  "Civil Engineering",
  "Traffic",
  "Water Supply",
];

const officerNames = ["Officer Mehra", "Officer Reddy", "Officer Sharma", "Officer Rao", "Officer Singh"];

const normalizeText = (value?: string) => (value || "").toLowerCase().replace(/&/g, "and");

const departmentsMatch = (reportDepartment?: string, officerDepartment?: string) => {
  const report = normalizeText(reportDepartment);
  const officer = normalizeText(officerDepartment);

  if (!report || !officer) return false;
  if (report === officer || report.includes(officer) || officer.includes(report)) return true;

  const aliases: Record<string, string[]> = {
    "roads": ["department of transportation", "transportation", "road", "pothole"],
    "sanitation": ["sanitation", "waste", "trash", "sewer"],
    "electrical": ["electricity", "streetlight", "power"],
    "drainage": ["drainage", "stormwater", "flood"],
    "civil engineering": ["civil", "infrastructure", "structural"],
    "traffic": ["traffic", "signage", "transport"],
    "water supply": ["water department", "water", "supply"],
  };

  return (aliases[officer] || []).some((alias) => report.includes(alias) || normalizeText(alias).includes(report));
};

const getWardFromAddress = (address?: string) => {
  const text = normalizeText(address);
  if (text.includes("ward 1")) return "Ward 1";
  if (text.includes("ward 2")) return "Ward 2";
  if (text.includes("ward 3")) return "Ward 3";
  if (text.includes("ward 4")) return "Ward 4";
  if (text.includes("ward 5")) return "Ward 5";
  return "Ward 3";
};

const getAreaFromAddress = (address?: string) => {
  const text = normalizeText(address || "");
  const areaMap = [
    ["downtown", "Downtown"],
    ["lakeside", "Lakeside"],
    ["greenwood", "Greenwood"],
    ["market", "Market Street"],
    ["river", "Riverfront"],
    ["north", "North Gate"],
    ["south", "South Avenue"],
  ] as const;

  const match = areaMap.find(([keyword]) => text.includes(keyword));
  return match ? match[1] : "Central Sector";
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

const getSeverityClass = (severity: string) => {
  switch (severity) {
    case "Critical":
      return "bg-[#451212] text-[#f87171] border-[#7f1d1d]";
    case "High":
      return "bg-[#45220d] text-[#fb923c] border-[#9a2c0d]";
    case "Medium":
      return "bg-[#332212] text-[#fbbf24] border-[#78350f]";
    case "Low":
      return "bg-[#112233] text-[#60a5fa] border-[#1e3a8a]";
    default:
      return "bg-[#1a1a1e] text-[#94949e] border-[#26262d]";
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "Resolved":
      return "bg-[#142d1e] text-[#34d399] border-[#064e3b]";
    case "In Progress":
      return "bg-[#122b3d] text-[#38bdf8] border-[#0369a1]";
    default:
      return "bg-[#2d2212] text-[#fbbf24] border-[#78350f]";
  }
};

const getDotColor = (severity: string) => {
  switch (severity) {
    case "Critical": return "bg-rose-500";
    case "High": return "bg-orange-500";
    case "Medium": return "bg-amber-500";
    default: return "bg-emerald-500";
  }
};

const OfficerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filters, setFilters] = useState<OfficerFilterState>({
    search: "",
    severity: "All",
    status: "All",
    issue: "All",
    ward: "All",
    department: "All",
    date: "All",
  });

  const officerHeaders = () => ({
    "x-civiclens-role": user?.role ?? "",
    "x-civiclens-district": user?.district ?? "",
    "x-civiclens-department": user?.department ?? "",
  });

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/reports", { headers: officerHeaders() });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Unable to load district complaints.");
        }

        const data = await res.json();
        setReports(data);
        if (data.length) {
          setSelectedReport((current) => current ?? data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch officer reports", err);
        setError(err instanceof Error ? err.message : "Unable to load district complaints.");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [user?.district, user?.department]);

  const currentView = useMemo<OfficerView>(() => {
    const path = location.pathname;
    if (path.includes("/complaints")) return "complaints";
    if (path.includes("/map")) return "map";
    if (path.includes("/analytics")) return "analytics";
    if (path.includes("/departments")) return "departments";
    if (path.includes("/profile")) return "profile";
    if (path.includes("/settings")) return "settings";
    return "dashboard";
  }, [location.pathname]);

  const detailId = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const complaintsIndex = segments.findIndex((segment) => segment === "complaints");
    return complaintsIndex >= 0 && segments[complaintsIndex + 1] ? segments[complaintsIndex + 1] : null;
  }, [location.pathname]);

  const scopeReports = useMemo(() => {
    return reports.filter((report) => {
      const districtMatch = normalizeText(report.district) === normalizeText(user?.district);
      const departmentMatch = departmentsMatch(report.suggested_department, user?.department);
      return districtMatch && departmentMatch;
    });
  }, [reports, user?.department, user?.district]);

  const filteredReports = useMemo(() => {
    return scopeReports.filter((report) => {
      const ward = getWardFromAddress(report.address);
      const department = report.suggested_department || "";
      const issue = report.issue_category || "";
      const matchesSearch =
        filters.search.length === 0 ||
        issue.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        (report.address || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        department.toLowerCase().includes(filters.search.toLowerCase());

      const matchesSeverity = filters.severity === "All" || report.severity === filters.severity;
      const matchesStatus = filters.status === "All" || report.status === filters.status;
      const matchesIssue = filters.issue === "All" || issue === filters.issue;
      const matchesWard = filters.ward === "All" || ward === filters.ward;
      const matchesDepartment = filters.department === "All" || department.includes(filters.department) || filters.department === department;
      const matchesDate = filters.date === "All" || new Date(report.upload_timestamp).toISOString().slice(0, 10) === filters.date;

      return matchesSearch && matchesSeverity && matchesStatus && matchesIssue && matchesWard && matchesDepartment && matchesDate;
    });
  }, [filters, scopeReports]);

  const issueOptions = useMemo(() => {
    return Array.from(new Set(scopeReports.map((report) => report.issue_category))).filter(Boolean);
  }, [scopeReports]);

  const wardOptions = useMemo(() => {
    return Array.from(new Set(scopeReports.map((report) => getWardFromAddress(report.address))));
  }, [scopeReports]);

  const stats = useMemo(() => {
    const total = scopeReports.length;
    const pending = scopeReports.filter((report) => report.status === "Pending").length;
    const resolved = scopeReports.filter((report) => report.status === "Resolved").length;
    const critical = scopeReports.filter((report) => report.severity === "Critical").length;
    const totalMinutes = scopeReports.reduce((sum, report) => {
      const createdAt = new Date(report.upload_timestamp).getTime();
      const resolvedAt = report.status === "Resolved" && (report as Report & { resolved_at?: string }).resolved_at
        ? new Date((report as Report & { resolved_at?: string }).resolved_at!).getTime()
        : Date.now();
      return sum + Math.max(30, Math.round((resolvedAt - createdAt) / 60000));
    }, 0);
    const avgResolution = total ? Math.round(totalMinutes / total) : 0;
    const today = scopeReports.filter((report) => new Date(report.upload_timestamp).toDateString() === new Date().toDateString()).length;

    return { total, pending, resolved, critical, avgResolution, today };
  }, [scopeReports]);

  const recentComplaints = useMemo(() => {
    return [...scopeReports].sort((a, b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime()).slice(0, 5);
  }, [scopeReports]);

  const priorityIncidents = useMemo(() => {
    return scopeReports.filter((report) => report.severity === "Critical" || report.severity === "High").slice(0, 4);
  }, [scopeReports]);

  const recentActivity = useMemo(() => {
    return [...scopeReports].sort((a, b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime()).slice(0, 6);
  }, [scopeReports]);

  const detailReport = useMemo(() => {
    if (detailId) {
      return scopeReports.find((report) => report.report_id === detailId) || null;
    }
    return selectedReport;
  }, [detailId, scopeReports, selectedReport]);

  const updateReport = async (reportId: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...officerHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setReports((prev) => prev.map((report) => (report.report_id === reportId ? updated : report)));
      if (selectedReport?.report_id === reportId) {
        setSelectedReport(updated);
      }
    } catch (error) {
      console.error("Failed to update report", error);
    }
  };

  const handleAssignOfficer = async (reportId: string) => {
    const value = window.prompt("Assign an officer for this complaint", selectedReport?.assigned_officer || officerNames[0]);
    if (value !== null) {
      await updateReport(reportId, { assigned_officer: value || officerNames[0] });
    }
  };

  const handleAddNote = async (reportId: string) => {
    const note = window.prompt("Add officer note", selectedReport?.officer_notes || "");
    if (note !== null) {
      await updateReport(reportId, { officer_notes: note });
    }
  };

  const handleResolve = async (reportId: string) => {
    await updateReport(reportId, {
      status: "Resolved",
      resolved_at: new Date().toISOString(),
      resolution_time_minutes: Math.max(30, Math.round((Date.now() - Date.parse(selectedReport?.upload_timestamp || new Date().toISOString())) / 60000)),
    });
  };

  const renderStatCard = (label: string, value: string, accent: string, subtitle: string, icon: React.ElementType) => {
    const Icon = icon;
    return (
      <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-5 shadow-[0_20px_45px_-24px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#71717a]">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#f7f7f9]">{value}</p>
            <p className="mt-2 text-sm text-[#94949e]">{subtitle}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (currentView) {
      case "complaints":
        return (
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-[#7f1d1d] bg-[#2d1111] px-4 py-3 text-sm text-[#fecaca]">
                {error}
              </div>
            )}
            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Complaint Operations</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#f7f7f9]">Municipality complaint management</h2>
                  <p className="mt-2 text-sm text-[#94949e]">District-scoped operations for {user?.district} • {user?.department}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate("/officer/complaints")}
                    className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]"
                  >
                    Clear view
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 xl:grid-cols-6">
                <label className="relative col-span-2 xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                    placeholder="Search complaints"
                    className="w-full rounded-xl border border-[#26262d] bg-[#0e0e12] py-2.5 pl-9 pr-3 text-sm text-[#f7f7f9] outline-none"
                  />
                </label>
                <select value={filters.severity} onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value as OfficerFilterState["severity"] }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Severity</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as OfficerFilterState["status"] }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <select value={filters.ward} onChange={(event) => setFilters((prev) => ({ ...prev, ward: event.target.value }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Ward</option>
                  {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
                </select>
                <input type="date" value={filters.date} onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]" />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-10 text-center text-[#94949e]">Loading officer complaints…</div>
                ) : filteredReports.length === 0 ? (
                  <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-10 text-center text-[#94949e]">No complaints match these filters.</div>
                ) : (
                  filteredReports.map((report) => (
                    <div key={report.report_id} className="rounded-2xl border border-[#26262d] bg-[#15151a] p-5 shadow-[0_20px_45px_-24px_rgba(0,0,0,0.9)]">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <img src={report.image_path} alt={report.issue_category} className="h-24 w-24 rounded-2xl object-cover" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-[#f7f7f9]">{report.issue_category}</h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getSeverityClass(report.severity)}`}>{report.severity}</span>
                            </div>
                            <p className="mt-2 text-sm text-[#94949e]">{report.description}</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#b8b8bf]">
                              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{report.address}</span>
                              <span>{getWardFromAddress(report.address)}</span>
                              <span>{getAreaFromAddress(report.address)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 lg:items-end">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusClass(report.status)}`}>{report.status}</span>
                          <span className="text-sm text-[#71717a]">{report.suggested_department}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#b9bbc4]">
                        <span className="rounded-full bg-[#1c1c22] px-3 py-1">Created {new Date(report.upload_timestamp).toLocaleString()}</span>
                        <span className="rounded-full bg-[#1c1c22] px-3 py-1">Assigned {report.assigned_officer || "Pending"}</span>
                        <span className="rounded-full bg-[#1c1c22] px-3 py-1">Notes {report.officer_notes ? "Updated" : "None"}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button onClick={() => { setSelectedReport(report); navigate(`/officer/complaints/${report.report_id}`); }} className="rounded-xl bg-[#1d4ed8] px-3 py-2 text-sm font-semibold text-white">Open Details</button>
                        <button onClick={() => handleAssignOfficer(report.report_id)} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Assign Officer</button>
                        <button onClick={() => updateReport(report.report_id, { status: "In Progress" })} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Update Status</button>
                        <button onClick={() => handleResolve(report.report_id)} className="rounded-xl border border-[#264a2d] bg-[#132a1e] px-3 py-2 text-sm text-[#34d399]">Mark Resolved</button>
                        <button onClick={() => handleAddNote(report.report_id)} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Add Notes</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-5 shadow-[0_20px_45px_-24px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Selected Complaint</p>
                    <h3 className="mt-1 text-xl font-semibold text-[#f7f7f9]">{detailReport ? detailReport.issue_category : "No selection"}</h3>
                  </div>
                  {detailReport && <button onClick={() => navigate(`/officer/complaints/${detailReport.report_id}`)} className="text-sm text-[#38bdf8]">Open details</button>}
                </div>
                {detailReport ? (
                  <div className="mt-5 space-y-4">
                    <img src={detailReport.image_path} alt={detailReport.issue_category} className="h-44 w-full rounded-2xl object-cover" />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleAssignOfficer(detailReport.report_id)} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Assign Officer</button>
                      <button onClick={() => updateReport(detailReport.report_id, { status: "In Progress" })} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Update Status</button>
                      <button onClick={() => handleResolve(detailReport.report_id)} className="rounded-xl border border-[#264a2d] bg-[#132a1e] px-3 py-2 text-sm text-[#34d399]">Resolve Complaint</button>
                      <button onClick={() => window.print()} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Generate PDF Report</button>
                    </div>
                    <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4 text-sm text-[#b8b8bf]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#71717a]">Officer Notes</p>
                      <p className="mt-2 text-[#f7f7f9]">{detailReport.officer_notes || "No officer notes yet. Use the add notes action to capture updates."}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">Status</p>
                        <p className="mt-2 text-lg font-semibold text-[#f7f7f9]">{detailReport.status}</p>
                      </div>
                      <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">Assigned Officer</p>
                        <p className="mt-2 text-lg font-semibold text-[#f7f7f9]">{detailReport.assigned_officer || "Unassigned"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#26262d] p-8 text-center text-[#94949e]">Choose a complaint to inspect its details.</div>
                )}
              </div>
            </div>
          </div>
        );
      case "map":
        return (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Live Map</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#f7f7f9]">District incidents by severity</h2>
                  <p className="mt-2 text-sm text-[#94949e]">Markers show live complaints routed to {user?.district}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-[#94949e]">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500" />Critical</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500" />High</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" />Medium</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" />Low</span>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-5">
                <select value={filters.issue} onChange={(event) => setFilters((prev) => ({ ...prev, issue: event.target.value }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Issue Type</option>
                  {issueOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
                </select>
                <select value={filters.severity} onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value as OfficerFilterState["severity"] }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Severity</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select value={filters.ward} onChange={(event) => setFilters((prev) => ({ ...prev, ward: event.target.value }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Ward</option>
                  {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
                </select>
                <select value={filters.department} onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Department</option>
                  {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as OfficerFilterState["status"] }))} className="rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                  <option value="All">Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="relative overflow-hidden rounded-3xl border border-[#26262d] bg-[#0b0b10] p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_45%)]" />
                <div className="relative flex min-h-[480px] flex-col justify-between">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#202028]" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#202028]" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-[#202028]" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-[#202028]" />
                  {filteredReports.map((report) => {
                    const lat = report.lat || 37.78;
                    const lng = report.lng || -122.42;
                    const top = 12 + ((lat - 37.74) / 0.08) * 72;
                    const left = 12 + ((lng + 122.46) / 0.12) * 76;
                    return (
                      <button
                        key={report.report_id}
                        onClick={() => { setSelectedReport(report); navigate(`/officer/complaints/${report.report_id}`); }}
                        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                        style={{ top: `${Math.min(88, Math.max(8, top))}%`, left: `${Math.min(88, Math.max(8, left))}%` }}
                      >
                        <span className={`h-4 w-4 rounded-full border-2 border-white ${getDotColor(report.severity)}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-5">
                <h3 className="text-lg font-semibold text-[#f7f7f9]">Incident markers</h3>
                <div className="mt-4 space-y-3">
                  {filteredReports.map((report) => (
                    <button key={report.report_id} onClick={() => { setSelectedReport(report); navigate(`/officer/complaints/${report.report_id}`); }} className="flex w-full items-center gap-3 rounded-2xl border border-[#26262d] bg-[#15151a] p-3 text-left">
                      <span className={`h-3 w-3 rounded-full ${getDotColor(report.severity)}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#f7f7f9]">{report.issue_category}</p>
                        <p className="truncate text-xs text-[#94949e]">{report.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case "analytics":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {renderStatCard("Complaints by Issue", `${stats.total}`, "bg-[#1d4ed8]/20 text-[#60a5fa]", "District intake", TrendingUp)}
              {renderStatCard("Resolution Rate", `${stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, "bg-[#14532d]/20 text-[#34d399]", "Service level", CheckCircle2)}
              {renderStatCard("Average Resolution", formatDuration(stats.avgResolution), "bg-[#78350f]/20 text-[#fb923c]", "Response window", Clock3)}
              {renderStatCard("Critical Cases", `${stats.critical}`, "bg-[#451212]/20 text-[#f87171]", "High-priority queue", AlertTriangle)}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Issue Type</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#f7f7f9]">Complaints by issue category</h3>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {Array.from(new Map(scopeReports.map((report) => [report.issue_category, 0])).keys()).slice(0, 6).map((issue) => {
                    const count = scopeReports.filter((report) => report.issue_category === issue).length;
                    return (
                      <div key={issue}>
                        <div className="mb-2 flex items-center justify-between text-sm text-[#e1e1e6]">
                          <span>{issue}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#1a1a1e]">
                          <div className="h-2 rounded-full bg-[#38bdf8]" style={{ width: `${Math.min(100, count * 20)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Ward Pulse</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#f7f7f9]">Complaints by ward</h3>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {wardOptions.map((ward) => {
                    const count = filteredReports.filter((report) => getWardFromAddress(report.address) === ward).length;
                    return (
                      <div key={ward}>
                        <div className="mb-2 flex items-center justify-between text-sm text-[#e1e1e6]">
                          <span>{ward}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#1a1a1e]">
                          <div className="h-2 rounded-full bg-[#fbbf24]" style={{ width: `${Math.min(100, count * 25)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Severity Distribution</p>
                <div className="mt-4 space-y-3">
                  {(["Critical", "High", "Medium", "Low"] as const).map((severity) => {
                    const count = scopeReports.filter((report) => report.severity === severity).length;
                    return <div key={severity} className="flex items-center justify-between text-sm text-[#e1e1e6]"><span>{severity}</span><span>{count}</span></div>;
                  })}
                </div>
              </div>
              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Department Performance</p>
                <div className="mt-4 space-y-3">
                  {departmentOptions.map((department) => {
                    const count = scopeReports.filter((report) => report.suggested_department.includes(department)).length;
                    return <div key={department} className="flex items-center justify-between text-sm text-[#e1e1e6]"><span>{department}</span><span>{count}</span></div>;
                  })}
                </div>
              </div>
              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Most Reported Area</p>
                <div className="mt-4 text-[#f7f7f9]">
                  <p className="text-2xl font-semibold">{getAreaFromAddress(scopeReports[0]?.address)}</p>
                  <p className="mt-2 text-sm text-[#94949e]">Highest cluster based on district intake.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case "departments":
        return (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {departmentOptions.map((department) => {
              const departmentReports = scopeReports.filter((report) => report.suggested_department.includes(department));
              const openCases = departmentReports.filter((report) => report.status !== "Resolved").length;
              const resolvedCases = departmentReports.filter((report) => report.status === "Resolved").length;
              const criticalCases = departmentReports.filter((report) => report.severity === "Critical").length;
              const avgResolution = departmentReports.length ? Math.round(departmentReports.reduce((sum, report) => sum + Math.max(30, Math.round((Date.now() - new Date(report.upload_timestamp).getTime()) / 60000)), 0) / departmentReports.length) : 0;
              return (
                <div key={department} className="rounded-3xl border border-[#26262d] bg-[#121217] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">{department}</p>
                      <h3 className="mt-2 text-xl font-semibold text-[#f7f7f9]">Department load</h3>
                    </div>
                    <Building2 className="h-5 w-5 text-[#38bdf8]" />
                  </div>
                  <div className="mt-5 grid gap-3 text-sm text-[#b8b8bf]">
                    <div className="flex items-center justify-between rounded-2xl bg-[#171821] px-3 py-2"><span>Open cases</span><span className="font-semibold text-[#f7f7f9]">{openCases}</span></div>
                    <div className="flex items-center justify-between rounded-2xl bg-[#171821] px-3 py-2"><span>Resolved cases</span><span className="font-semibold text-[#f7f7f9]">{resolvedCases}</span></div>
                    <div className="flex items-center justify-between rounded-2xl bg-[#171821] px-3 py-2"><span>Critical cases</span><span className="font-semibold text-[#f7f7f9]">{criticalCases}</span></div>
                    <div className="flex items-center justify-between rounded-2xl bg-[#171821] px-3 py-2"><span>Average resolution</span><span className="font-semibold text-[#f7f7f9]">{formatDuration(avgResolution)}</span></div>
                    <div className="flex items-center justify-between rounded-2xl bg-[#171821] px-3 py-2"><span>Assigned officers</span><span className="font-semibold text-[#f7f7f9]">{Math.min(3, departmentReports.length || 1)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      case "profile":
        return (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#fbbf24]/10 p-3 text-[#fbbf24]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Officer Profile</p>
                  <h2 className="text-2xl font-semibold text-[#f7f7f9]">{user?.id}</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">Department</p><p className="mt-2 text-lg font-semibold text-[#f7f7f9]">{user?.department}</p></div>
                <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">District</p><p className="mt-2 text-lg font-semibold text-[#f7f7f9]">{user?.district}</p></div>
                <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">Total Cases Handled</p><p className="mt-2 text-lg font-semibold text-[#f7f7f9]">{stats.total}</p></div>
                <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">Cases Resolved</p><p className="mt-2 text-lg font-semibold text-[#f7f7f9]">{stats.resolved}</p></div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Performance</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4">
                  <p className="text-sm text-[#94949e]">Performance Score</p>
                  <p className="mt-2 text-4xl font-semibold text-[#f7f7f9]">{stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%</p>
                </div>
                <div className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4">
                  <p className="text-sm text-[#94949e]">Critical backlog</p>
                  <p className="mt-2 text-3xl font-semibold text-[#f87171]">{stats.critical}</p>
                </div>
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Notification Preferences</p>
              <div className="mt-5 space-y-3">
                {[
                  ["Critical incidents", true],
                  ["Daily digest", true],
                  ["Escalation alerts", false],
                ].map(([label, enabled]) => (
                  <label key={label} className="flex items-center justify-between rounded-2xl border border-[#26262d] bg-[#15151a] px-4 py-3 text-sm text-[#f7f7f9]">
                    <span>{label}</span>
                    <input type="checkbox" defaultChecked={Boolean(enabled)} className="h-4 w-4 rounded border-[#26262d] bg-transparent" />
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Theme and Profile</p>
              <div className="mt-5 space-y-4">
                <label className="block text-sm text-[#e1e1e6]">
                  <span className="mb-2 block text-[#94949e]">Theme</span>
                  <select className="w-full rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                    <option>Dark Modern</option>
                    <option>High Contrast</option>
                  </select>
                </label>
                <label className="block text-sm text-[#e1e1e6]">
                  <span className="mb-2 block text-[#94949e]">Language</span>
                  <select className="w-full rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]">
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                </label>
                <label className="block text-sm text-[#e1e1e6]">
                  <span className="mb-2 block text-[#94949e]">Profile Notes</span>
                  <textarea className="min-h-24 w-full rounded-xl border border-[#26262d] bg-[#0e0e12] px-3 py-2.5 text-sm text-[#f7f7f9]" defaultValue="District operating profile is active." />
                </label>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-[#7f1d1d] bg-[#2d1111] px-4 py-3 text-sm text-[#fecaca]">
                {error}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {renderStatCard("Total Complaints", `${stats.total}`, "bg-[#1d4ed8]/20 text-[#60a5fa]", "District scope", FileText)}
              {renderStatCard("Pending Complaints", `${stats.pending}`, "bg-[#78350f]/20 text-[#fb923c]", "Needs review", Clock3)}
              {renderStatCard("Resolved Complaints", `${stats.resolved}`, "bg-[#14532d]/20 text-[#34d399]", "Completed", CheckCircle2)}
              {renderStatCard("Critical Complaints", `${stats.critical}`, "bg-[#451212]/20 text-[#f87171]", "Immediate action", AlertTriangle)}
              {renderStatCard("Average Resolution Time", formatDuration(stats.avgResolution), "bg-[#1a4d5c]/20 text-[#38bdf8]", "Response window", Clock3)}
              {renderStatCard("Complaints Today", `${stats.today}`, "bg-[#422006]/20 text-[#fbbf24]", "Today’s intake", Sparkles)}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Recent Complaints</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#f7f7f9]">Latest district updates</h2>
                  </div>
                  <button onClick={() => navigate("/officer/complaints")} className="flex items-center gap-2 text-sm text-[#38bdf8]">View all <ChevronRight className="h-4 w-4" /></button>
                </div>
                <div className="mt-6 space-y-4">
                  {recentComplaints.map((report) => (
                    <div key={report.report_id} className="flex items-start gap-4 rounded-2xl border border-[#26262d] bg-[#15151a] p-4">
                      <img src={report.image_path} alt={report.issue_category} className="h-16 w-16 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#f7f7f9]">{report.issue_category}</h3>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getSeverityClass(report.severity)}`}>{report.severity}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#94949e]">{report.description}</p>
                        <p className="mt-2 text-sm text-[#b8b8bf]">{report.address} • {getWardFromAddress(report.address)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Priority Incidents</p>
                  <div className="mt-5 space-y-3">
                    {priorityIncidents.map((report) => (
                      <div key={report.report_id} className="rounded-2xl border border-[#26262d] bg-[#15151a] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#f7f7f9]">{report.issue_category}</p>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getSeverityClass(report.severity)}`}>{report.severity}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#94949e]">{report.address}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Quick Actions</p>
                  <div className="mt-5 space-y-3">
                    <button onClick={() => navigate("/officer/complaints")} className="flex w-full items-center justify-between rounded-2xl border border-[#26262d] bg-[#15151a] px-4 py-3 text-sm text-[#f7f7f9]"><span><PlusCircle className="mr-2 inline h-4 w-4" />Review complaints</span><ChevronRight className="h-4 w-4" /></button>
                    <button onClick={() => navigate("/officer/map")} className="flex w-full items-center justify-between rounded-2xl border border-[#26262d] bg-[#15151a] px-4 py-3 text-sm text-[#f7f7f9]"><span><MapIcon className="mr-2 inline h-4 w-4" />Open live map</span><ChevronRight className="h-4 w-4" /></button>
                    <button onClick={() => navigate("/officer/analytics")} className="flex w-full items-center justify-between rounded-2xl border border-[#26262d] bg-[#15151a] px-4 py-3 text-sm text-[#f7f7f9]"><span><BarChart3 className="mr-2 inline h-4 w-4" />View analytics</span><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Recent Activity</p>
                  <div className="mt-5 space-y-3">
                    {recentActivity.map((report) => (
                      <div key={report.report_id} className="flex items-center gap-3 rounded-2xl border border-[#26262d] bg-[#15151a] p-3 text-sm text-[#b8b8bf]">
                        <MessageSquareText className="h-4 w-4 text-[#38bdf8]" />
                        <span>{report.issue_category} • {report.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f7f7f9]">
      <header className="border-b border-[#26262d] bg-[#101014]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#fbbf24]/10 p-3 text-[#fbbf24]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#f7f7f9]">CivicLens Officer Portal</p>
              <p className="text-sm text-[#94949e]">District operations for {user?.district}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => logout()} className="rounded-xl border border-[#26262d] bg-[#18181c] px-3 py-2 text-sm text-[#e1e1e6]">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 rounded-3xl border border-[#26262d] bg-[#111116] p-4 lg:w-72">
          <div className="rounded-2xl border border-[#26262d] bg-[#171821] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#71717a]">Officer Profile</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-2xl bg-[#fbbf24]/10 p-2.5 text-[#fbbf24]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[#f7f7f9]">{user?.id}</p>
                <p className="text-sm text-[#94949e]">{user?.department}</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button key={item.id} onClick={() => navigate(`/officer/${item.id === "dashboard" ? "dashboard" : item.id}`)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${active ? "bg-[#1d4ed8]/20 text-[#60a5fa]" : "bg-transparent text-[#b8b8bf] hover:bg-[#18181c]"}`}>
                  <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{item.label}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-[#26262d] bg-[#171821] p-4 text-sm text-[#94949e]">
            <div className="flex items-center gap-2 text-[#fbbf24]"><Bell className="h-4 w-4" /> District updates</div>
            <p className="mt-2">Complaints are filtered to your assigned district and department automatically.</p>
          </div>
        </aside>

        <main className="flex-1">
          {detailId && currentView === "complaints" && (
            <div className="mb-4 flex items-center gap-2 text-sm text-[#38bdf8]">
              <button onClick={() => navigate("/officer/complaints")} className="flex items-center gap-2 rounded-xl border border-[#26262d] bg-[#121217] px-3 py-2">
                <ArrowLeft className="h-4 w-4" /> Back to complaints
              </button>
            </div>
          )}
          {loading && currentView === "dashboard" ? (
            <div className="rounded-3xl border border-[#26262d] bg-[#121217] p-12 text-center text-[#94949e]">
              <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin" />
              Syncing district complaints…
            </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>
    </div>
  );
};

export default OfficerDashboard;
