import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UploadCloud,
  MapPin,
  Grid,
  List,
  Building2,
  Sparkles,
  Plus,
  Search,
  Compass,
  TrendingUp,
  Map,
  X,
  FileText,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Info,
  LogOut,
  User as UserIcon,
  Shield
} from "lucide-react";
import { Report, FilterSeverity, FilterStatus } from "./types";

// Auth Imports
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./auth/Login";
import { Register } from "./auth/Register";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import OfficerPortal from "./pages/officer/OfficerDashboard";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";

// Citizen Portal Imports
import CitizenLayout from "./components/layout/CitizenLayout";
import CitizenHome from "./pages/citizen/CitizenHome";
import ReportIssue from "./pages/citizen/ReportIssue";
import MyReports from "./pages/citizen/MyReports";
import Profile from "./pages/citizen/Profile";

// Badge helper classes
const getSeverityBadgeClass = (sev: string) => {
  switch (sev) {
    case "Critical":
      return "bg-[#451212] text-[#f87171] border border-[#7f1d1d]";
    case "High":
      return "bg-[#451a1a] text-[#f87171] border border-[#7f1d1d]";
    case "Medium":
      return "bg-[#332212] text-[#fbbf24] border border-[#78350f]";
    case "Low":
      return "bg-[#112233] text-[#60a5fa] border border-[#1e3a8a]";
    default:
      return "bg-[#1a1a1e] text-[#94949e] border border-[#26262d]";
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-[#2d2212] text-[#fbbf24] border border-[#78350f]";
    case "In Progress":
      return "bg-[#122b3d] text-[#38bdf8] border border-[#0369a1]";
    case "Resolved":
      return "bg-[#142d1e] text-[#34d399] border border-[#064e3b]";
    default:
      return "bg-[#1a1a1e] text-[#94949e] border border-[#26262d]";
  }
};

const normalizeText = (value?: string) => (value || "").toLowerCase().replace(/&/g, "and");

const departmentsMatch = (reportDepartment?: string, officerDepartment?: string) => {
  const report = normalizeText(reportDepartment);
  const officer = normalizeText(officerDepartment);

  if (!report || !officer) return false;
  if (report === officer || report.includes(officer) || officer.includes(report)) return true;

  const aliases: Record<string, string[]> = {
    "roads department": ["department of transportation", "transportation", "road", "pothole"],
    "water and sanitation": ["water department", "water", "sanitation", "sewer"],
    "electricity department": ["electricity", "streetlight", "power"],
    "parks and recreation": ["parks and recreation", "parks", "recreation"],
    "public works": ["department of public works", "public works"],
    "health and safety": ["health", "safety", "public hazard"],
    "traffic management": ["traffic", "signage", "transportation"],
  };

  return (aliases[officer] || []).some((alias) => report.includes(alias) || normalizeText(alias).includes(report));
};

// ==========================================
// CITIZEN DASHBOARD COMPONENT
// ==========================================
const CitizenDashboard: React.FC = () => {
  return (
    <CitizenLayout>
      <Routes>
        <Route path="home" element={<CitizenHome />} />
        <Route path="report" element={<ReportIssue />} />
        <Route path="my-reports" element={<MyReports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </CitizenLayout>
  );

};

// ==========================================
// MUNICIPALITY OFFICER DASHBOARD COMPONENT
// ==========================================
const OfficerDashboard: React.FC = () => {
  return <OfficerPortal />;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active tab derived from route
  const getActiveTab = (): "dashboard" | "list" | "map" => {
    const path = location.pathname;
    if (path.includes("/list")) return "list";
    if (path.includes("/map")) return "map";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<FilterSeverity>("All");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Selection for details panel
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const officerHeaders = () => ({
    "x-civiclens-role": user?.role ?? "",
    "x-civiclens-district": user?.district ?? "",
    "x-civiclens-department": user?.department ?? "",
  });

  useEffect(() => {
    fetchReports();
  }, [user?.role, user?.district, user?.department]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports", { headers: officerHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (id: string, status: "Pending" | "In Progress" | "Resolved") => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...officerHeaders() },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const updated = await res.json();
        setReports((prev) => prev.map((r) => (r.report_id === id ? updated : r)));
        if (selectedReport && selectedReport.report_id === id) {
          setSelectedReport(updated);
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Helper matching rule: does a report fall in officer's district assignment?
  const isInPurview = (r: Report) => {
    const districtMatch = normalizeText(r.district) === normalizeText(user?.district);
    const deptMatch = departmentsMatch(r.suggested_department, user?.department);
    return districtMatch && deptMatch;
  };

  // Filtered reports list (applying purview + other criteria)
  const filteredReports = reports.filter((r) => {
    const matchesPurview = isInPurview(r);

    const matchesSearch =
      r.issue_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.suggested_department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === "All" || r.severity === selectedSeverity;
    const matchesStatus = selectedStatus === "All" || r.status === selectedStatus;

    return matchesPurview && matchesSearch && matchesSeverity && matchesStatus;
  });

  const getCounts = () => {
    const currentList = reports.filter(isInPurview);
    const total = currentList.length;
    const pending = currentList.filter((r) => r.status === "Pending").length;
    const inProgress = currentList.filter((r) => r.status === "In Progress").length;
    const resolved = currentList.filter((r) => r.status === "Resolved").length;
    const critical = currentList.filter((r) => r.severity === "Critical" || r.severity === "High").length;

    return { total, pending, inProgress, resolved, critical };
  };

  const counts = getCounts();

  return (
    <div className="min-h-screen bg-[#0a0a0b] font-sans text-[#e1e1e6] flex flex-col antialiased">
      {/* Header */}
      <header className="bg-[#111114] border-b border-[#26262d] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/officer")}>
              <div className="bg-[#fbbf24] text-[#0a0a0b] p-2.5 rounded-xl shadow-md flex items-center justify-center">
                <Shield className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xl text-[#e1e1e6] tracking-tight">CivicLens</span>
                  <span className="text-[10px] bg-[#fbbf24]/10 text-[#fbbf24] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Officer Portal</span>
                </div>
                <p className="text-xs text-[#94949e] font-medium">Internal Dispatch System</p>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="flex space-x-1 bg-[#141417] p-1 rounded-xl border border-[#26262d]">
              <button
                onClick={() => navigate("/officer/dashboard")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "dashboard"
                    ? "bg-[#1a1a1e] text-[#fbbf24] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </button>

              <button
                onClick={() => navigate("/officer/list")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "list"
                    ? "bg-[#1a1a1e] text-[#fbbf24] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Ticket Ledger</span>
              </button>

              <button
                onClick={() => navigate("/officer/map")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "map"
                    ? "bg-[#1a1a1e] text-[#fbbf24] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <Map className="h-4 w-4" />
                <span>Civic Grid</span>
              </button>
            </nav>

            {/* Logout/Officer Department Badge */}
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-[#e1e1e6]">Officer {user?.id}</span>
                <span className="text-[10px] text-[#fbbf24] font-semibold">{user?.district} â€¢ {user?.department?.replace("Department of ", "")}</span>
              </div>
              <button
                onClick={logout}
                className="bg-[#18181c] border border-[#26262d] hover:bg-[#451212] hover:text-[#f87171] p-2 rounded-xl text-[#94949e] transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Officer info Banner */}
        <div className="mb-6 bg-[#171412] border-l-4 border-[#fbbf24] p-4 rounded-r-xl flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-md border-y border-r border-[#26262d] gap-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-[#fbbf24] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[#e1e1e6] text-sm">District Officer Dashboard</h4>
              <p className="text-xs text-[#94949e] mt-1">
                Currently tracking tickets designated for the <strong>{user?.department}</strong> in <strong>{user?.district}</strong>.
              </p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* OFFICER TAB 1: OVERVIEW */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">My District Tickets</span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.total}</span>
                    <span className="text-xs text-[#94949e] font-medium">reports</span>
                  </div>
                </div>

                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#fbbf24] uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 mr-1" /> Pending Review
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#fbbf24]">{counts.pending}</span>
                    <span className="text-xs text-[#94949e] font-medium">waiting</span>
                  </div>
                </div>

                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#38bdf8] uppercase tracking-wider flex items-center space-x-1">
                    <Compass className="h-3.5 w-3.5 mr-1" /> Dispatch active
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.inProgress}</span>
                    <span className="text-xs text-[#94949e] font-medium">active</span>
                  </div>
                </div>

                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#34d399] uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolved Cases
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.resolved}</span>
                    <span className="text-xs text-[#34d399] font-medium">
                      ({counts.total ? Math.round((counts.resolved / counts.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-[#451a1a] border border-[#7f1d1d] p-5 rounded-2xl flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#f87171] uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> District Critical
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#f87171]">{counts.critical}</span>
                    <span className="text-xs text-[#f87171]/80 font-medium">urgent</span>
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Purview Activities */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-[#e1e1e6]">
                        District Dispatch Feed
                      </h3>
                      <p className="text-xs text-[#94949e] font-medium">
                        Showing {filteredReports.length} tickets persisted in SQLite
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/officer/list")}
                      className="text-xs font-semibold text-[#fbbf24] hover:text-[#fbbf24]/80 flex items-center cursor-pointer"
                    >
                      <span>Go to Ledger</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </button>
                  </div>

                  <div className="bg-[#141417] border border-[#26262d] rounded-2xl overflow-hidden shadow-md divide-y divide-[#26262d]">
                    {loading ? (
                      <div className="p-8 text-center text-[#94949e] text-sm">Syncing SQLite ledger...</div>
                    ) : filteredReports.length === 0 ? (
                      <div className="p-8 text-center text-[#94949e] text-sm">
                        No tickets matching current filters.
                      </div>
                    ) : (
                      filteredReports.slice(0, 5).map((report) => (
                        <div
                          key={report.report_id}
                          onClick={() => {
                            setSelectedReport(report);
                            navigate("/officer/list");
                          }}
                          className="p-5 hover:bg-[#1a1a20] transition-colors duration-150 cursor-pointer flex space-x-4 items-start"
                        >
                          <img
                            src={report.image_path}
                            alt={report.issue_category}
                            className="h-16 w-16 rounded-xl object-cover border border-[#26262d] flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm sm:text-base text-[#e1e1e6] truncate">
                                {report.issue_category}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(report.severity)}`}>
                                {report.severity}
                              </span>
                            </div>
                            <p className="text-xs text-[#94949e] font-medium mt-0.5 flex items-center">
                              <MapPin className="h-3.5 w-3.5 mr-1 text-[#94949e]" />
                              <span className="truncate">{report.address}</span>
                            </p>
                            <p className="text-xs text-[#a1a1aa] mt-2 line-clamp-2">{report.description}</p>
                            <div className="flex items-center space-x-2.5 mt-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(report.status)}`}>
                                {report.status}
                              </span>
                              <span className="text-[10px] text-[#71717a] font-medium">
                                Filed {new Date(report.upload_timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Scope panel */}
                <div className="space-y-6">
                  <div className="bg-[#141417] border border-[#26262d] p-6 rounded-2xl shadow-md space-y-4">
                    <h3 className="font-bold text-[#e1e1e6] text-base">District Routing Status</h3>
                    <p className="text-xs text-[#94949e] leading-relaxed font-medium">
                      Reports currently assigned to your district and department.
                    </p>

                    <div className="pt-2 space-y-4">
                      <div className="bg-[#18181c] p-4 rounded-xl border border-[#26262d] space-y-2">
                        <span className="text-[10px] text-[#94949e] uppercase font-bold tracking-wider block">District Scope</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-semibold text-[#e1e1e6]">Visible District Tickets</span>
                          <span className="text-xl font-extrabold text-[#fbbf24]">{counts.total}</span>
                        </div>
                      </div>

                      <div className="bg-[#18181c] p-4 rounded-xl border border-[#26262d] space-y-2">
                        <span className="text-[10px] text-[#94949e] uppercase font-bold tracking-wider block">Purview Load</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-semibold text-[#e1e1e6]">My Assigned Tickets</span>
                          <span className="text-xl font-extrabold text-[#fbbf24]">{counts.total}</span>
                        </div>
                        <div className="h-1.5 bg-[#0a0a0b] rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-[#fbbf24] rounded-full"
                            style={{ width: `${reports.length ? (counts.total / reports.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* OFFICER TAB 2: LEDGER */}
          {activeTab === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-[#141417] border border-[#26262d] p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#e1e1e6]">Officer Incident Ledger</h2>
                    <p className="text-xs text-[#94949e] font-medium">SQLite ticket registry management terminal</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                        viewMode === "grid" ? "bg-[#1a1a1e] border-[#fbbf24] text-[#fbbf24]" : "bg-[#141417] border-[#26262d] text-[#94949e]"
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                        viewMode === "list" ? "bg-[#1a1a1e] border-[#fbbf24] text-[#fbbf24]" : "bg-[#141417] border-[#26262d] text-[#94949e]"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94949e]" />
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2.5 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#fbbf24]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-[#94949e] flex-shrink-0">Severity:</span>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value as FilterSeverity)}
                      className="py-2.5 px-3 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#fbbf24]"
                    >
                      <option value="All">All Levels</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-[#94949e] flex-shrink-0">Status:</span>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as FilterStatus)}
                      className="py-2.5 px-3 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#fbbf24]"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                  {loading ? (
                    <div className="bg-[#141417] p-16 text-center border border-[#26262d] rounded-3xl text-[#94949e]">
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#fbbf24] border-t-transparent mx-auto mb-3" />
                      <span>Syncing ledger...</span>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="bg-[#141417] p-16 text-center border border-[#26262d] rounded-3xl text-[#94949e]">
                      <FileText className="h-10 w-10 text-[#26262d] mx-auto mb-3" />
                      <p className="font-semibold text-[#e1e1e6]">No tickets found</p>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredReports.map((report) => (
                        <div
                          key={report.report_id}
                          onClick={() => setSelectedReport(report)}
                          className={`bg-[#141417] border p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-101 flex flex-col justify-between space-y-4 ${
                            selectedReport?.report_id === report.report_id ? "border-[#fbbf24] ring-1 ring-[#fbbf24]" : "border-[#26262d]"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-950 border border-[#26262d]">
                              <img src={report.image_path} alt={report.issue_category} className="h-full w-full object-cover" />
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-md ${getSeverityBadgeClass(report.severity)}`}>
                                  {report.severity}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-[#e1e1e6] text-sm truncate">{report.issue_category}</h3>
                              <p className="text-[11px] text-[#94949e] font-medium mt-0.5 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span className="truncate">{report.address}</span>
                              </p>
                              <p className="text-xs text-[#a1a1aa] line-clamp-2 mt-2 leading-relaxed">{report.description}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-[#26262d]">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(report.status)}`}>
                              {report.status}
                            </span>
                            <span className="text-[10px] text-[#71717a] font-semibold">
                              {new Date(report.upload_timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#141417] border border-[#26262d] rounded-3xl overflow-hidden divide-y divide-[#26262d]">
                      {filteredReports.map((report) => (
                        <div
                          key={report.report_id}
                          onClick={() => setSelectedReport(report)}
                          className={`p-4 sm:p-5 cursor-pointer flex space-x-4 items-center hover:bg-[#1a1a20]/50 ${
                            selectedReport?.report_id === report.report_id ? "bg-[#1a1a20]" : ""
                          }`}
                        >
                          <img src={report.image_path} alt={report.issue_category} className="h-14 w-14 rounded-lg object-cover border border-[#26262d] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-bold text-[#e1e1e6] text-sm sm:text-base truncate">{report.issue_category}</h3>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${getSeverityBadgeClass(report.severity)}`}>
                                {report.severity}
                              </span>
                            </div>
                            <p className="text-xs text-[#94949e] font-medium flex items-center mt-0.5 truncate">
                              <MapPin className="h-3 w-3 mr-1 text-[#94949e]" />
                              <span className="truncate">{report.address}</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(report.status)}`}>
                              {report.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detail Panel with Actions active (Status select + Delete button active) */}
                <div className="bg-[#141417] border border-[#26262d] p-6 rounded-2xl shadow-sm sticky top-24 space-y-6">
                  {selectedReport ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-[#fbbf24] font-extrabold uppercase tracking-wider">Ticket Dispatch</span>
                          <h3 className="font-extrabold text-[#e1e1e6] text-lg leading-tight mt-0.5">{selectedReport.issue_category}</h3>
                        </div>
                        </div>

                      <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-950 border border-[#26262d]">
                        <img src={selectedReport.image_path} alt={selectedReport.issue_category} className="h-full w-full object-cover" />
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-[#94949e] font-bold uppercase text-[10px] tracking-wider">Modify Dispatch Status</label>
                          <select
                            value={selectedReport.status}
                            onChange={(e) => updateReportStatus(selectedReport.report_id, e.target.value as any)}
                            className="py-2.5 px-3 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm font-semibold rounded-xl focus:outline-none focus:ring-1 focus:ring-[#fbbf24] focus:bg-[#1a1a1e] cursor-pointer"
                          >
                            <option value="Pending">ðŸ•’ Pending Review</option>
                            <option value="In Progress">ðŸ› ï¸ In Progress</option>
                            <option value="Resolved">âœ… Resolved</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-[#18181c] p-4 border border-[#26262d] rounded-xl">
                          <div>
                            <span className="text-[#94949e] font-bold block mb-0.5 uppercase tracking-wider text-[9px]">Severity Level</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(selectedReport.severity)}`}>
                              {selectedReport.severity}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#94949e] font-bold block mb-0.5 uppercase tracking-wider text-[9px]">Ledger ID</span>
                            <span className="font-mono text-[#e1e1e6] truncate block max-w-full font-semibold">{selectedReport.report_id}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[#94949e] font-bold uppercase text-[9px] tracking-wider">Issue Description</span>
                          <p className="text-[#e1e1e6] leading-relaxed bg-[#18181c] p-3 rounded-xl border border-[#26262d] font-light">
                            {selectedReport.description}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[#94949e] font-bold uppercase text-[9px] tracking-wider">Assigned Department</span>
                          <div className="flex items-center space-x-2 bg-[#18181c] p-3 rounded-xl border border-[#26262d]">
                            <Briefcase className="h-4 w-4 text-[#fbbf24]" />
                            <span className="text-[#e1e1e6] font-semibold">{selectedReport.suggested_department}</span>
                          </div>
                        </div>

                        {selectedReport.address && (
                          <div className="space-y-1">
                            <span className="text-[#94949e] font-bold uppercase text-[9px] tracking-wider">Geographic Address</span>
                            <div className="flex items-center space-x-2 bg-[#18181c] p-3 rounded-xl border border-[#26262d]">
                              <MapPin className="h-4 w-4 text-[#fbbf24]" />
                              <span className="text-[#e1e1e6] font-semibold">{selectedReport.address}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-[#94949e] border-2 border-dashed border-[#26262d] rounded-xl">
                      <Info className="h-8 w-8 text-[#26262d] mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-[#e1e1e6]">No ticket selected</h4>
                      <p className="text-xs text-[#94949e] mt-1 font-light">Click any report card or row to load database telemetry fields.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* OFFICER TAB 3: MAP */}
          {activeTab === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-[#141417] border border-[#26262d] p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#e1e1e6]">Civic Grid Monitor</h2>
                    <p className="text-sm text-[#94949e]">Live geographic routing monitor of municipal hazards</p>
                  </div>
                  <div className="flex space-x-4 text-xs font-semibold">
                    <span className="flex items-center text-rose-400"><span className="h-2.5 w-2.5 bg-rose-500 rounded-full mr-1.5" /> Critical</span>
                    <span className="flex items-center text-amber-400"><span className="h-2.5 w-2.5 bg-amber-500 rounded-full mr-1.5" /> High</span>
                    <span className="flex items-center text-blue-400"><span className="h-2.5 w-2.5 bg-blue-500 rounded-full mr-1.5" /> Medium</span>
                    <span className="flex items-center text-[#94949e]"><span className="h-2.5 w-2.5 bg-slate-500 rounded-full mr-1.5" /> Low</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 bg-slate-950 border border-slate-800 p-4 rounded-3xl shadow-xl relative min-h-[500px] flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
                  <div className="absolute inset-0 pointer-events-none border border-slate-900">
                    <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-slate-800/50" />
                    <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-slate-800/50" />
                    <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-slate-800/50" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-0.5 bg-slate-800/50" />
                  </div>

                  <div className="relative flex-1">
                    {filteredReports.map((report) => {
                      const lat = report.lat || 37.78;
                      const lng = report.lng || -122.42;
                      const latMin = 37.70;
                      const latMax = 37.82;
                      const lngMin = -122.52;
                      const lngMax = -122.36;

                      const topPct = 100 - ((lat - latMin) / (latMax - latMin)) * 100;
                      const leftPct = ((lng - lngMin) / (lngMax - lngMin)) * 100;
                      const clamp = (val: number) => Math.min(Math.max(val, 8), 92);

                      const dotColor =
                        report.severity === "Critical"
                          ? "bg-rose-500 shadow-rose-500/60"
                          : report.severity === "High"
                          ? "bg-amber-500 shadow-amber-500/60"
                          : report.severity === "Medium"
                          ? "bg-blue-500 shadow-blue-500/60"
                          : "bg-slate-400 shadow-slate-400/60";

                      return (
                        <div
                          key={report.report_id}
                          className="absolute group transition-transform duration-200"
                          style={{
                            top: `${clamp(topPct)}%`,
                            left: `${clamp(leftPct)}%`,
                          }}
                        >
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              navigate("/officer/list");
                            }}
                            className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 focus:outline-none cursor-pointer"
                          >
                            <span className={`absolute inline-flex h-6 w-6 rounded-full animate-ping opacity-25 ${dotColor}`} />
                            <span className={`relative inline-flex rounded-full h-4.5 w-4.5 border-2 border-white shadow-lg ${dotColor}`} />
                          </button>

                          <div className="absolute left-1/2 bottom-5 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-52 z-30 space-y-1.5 text-center">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{report.severity} Priority</span>
                            <h4 className="font-bold text-xs text-white truncate">{report.issue_category}</h4>
                            <p className="text-[10px] text-slate-300 truncate">{report.address}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-3 relative z-10">
                    <span>GRID RADAR ACTIVE</span>
                    <span>BOUNDS: SF MUNICIPALITY COORDS</span>
                  </div>
                </div>

                <div className="bg-[#141417] border border-[#26262d] p-6 rounded-3xl shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-[#e1e1e6] text-base">Node Registry</h3>
                    <p className="text-xs text-[#94949e] font-medium mt-0.5">Click any node to focus ticket details</p>
                  </div>
                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                    {filteredReports.map((report) => (
                      <div
                        key={report.report_id}
                        onClick={() => {
                          setSelectedReport(report);
                          navigate("/officer/list");
                        }}
                        className={`p-3 border rounded-xl cursor-pointer transition-all duration-150 flex items-center space-x-3 hover:bg-[#18181c] ${
                          selectedReport?.report_id === report.report_id ? "border-[#fbbf24] bg-[#1a1a20]" : "border-[#26262d] bg-[#141417]"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full flex-shrink-0 ${
                          report.severity === "Critical" ? "bg-rose-500" : report.severity === "High" ? "bg-amber-500" : report.severity === "Medium" ? "bg-blue-500" : "bg-slate-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-[#e1e1e6] truncate leading-tight">{report.issue_category}</h4>
                          <span className="text-[10px] text-[#94949e] block truncate font-mono mt-0.5">
                            {report.lat ? `${report.lat.toFixed(4)}, ${report.lng?.toFixed(4)}` : "Simulated Coords"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-[#0a0a0b] border-t border-[#1f1f23] py-6 mt-12 text-center">
        <p className="text-xs text-[#71717a] font-medium">
          Â© {new Date().getFullYear()} CivicLens. Officer Portal. District Scope Active. SQLite persisted logs.
        </p>
      </footer>
    </div>
  );
};

// ==========================================
// APP COMPONENT (ROUTING ROOT)
// ==========================================
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen Routes */}
          <Route
            path="/citizen/*"
            element={
              <ProtectedRoute allowedRole="citizen">
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          {/* Officer Routes */}
          <Route
            path="/officer/*"
            element={
              <ProtectedRoute allowedRole="officer">
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Routes */}
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRole="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default Redirection Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
