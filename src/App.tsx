import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UploadCloud,
  Trash2,
  MapPin,
  SlidersHorizontal,
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
  HelpCircle,
  Briefcase,
  ChevronRight,
  Info
} from "lucide-react";
import { Report, FilterSeverity, FilterStatus, TabType } from "./types";

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<FilterSeverity>("All");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Selection for details panel
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Report | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stepper messages for analysis
  const stepperMessages = [
    "Analyzing image structure & exposure...",
    "Consulting Gemini AI vision model...",
    "Extracting issue details & civic category...",
    "Determining priority level & severity...",
    "Routing to responsible municipal department...",
    "Generating public safety coordinate pin...",
    "Creating SQLite ledger ticket..."
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  // Interval logic for fake stepper when analyzing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzing) {
      setAnalyzingStep(0);
      interval = setInterval(() => {
        setAnalyzingStep((prev) => {
          if (prev < stepperMessages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      } else {
        console.error("Failed to load reports");
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files (.png, .jpg, .jpeg, .webp) are supported.");
      return;
    }
    setUploadError(null);
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setAnalysisResult(null);
  };

  const triggerUpload = async () => {
    if (!uploadFile) return;

    setAnalyzing(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("image", uploadFile);

    try {
      const res = await fetch("/api/reports/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Analysis failed.");
      }

      setAnalysisResult(data);
      setReports((prev) => [data, ...prev]);
      // Show success briefly, then switch or reset
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "An error occurred during Gemini processing.");
    } finally {
      setAnalyzing(false);
    }
  };

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setAnalysisResult(null);
    setUploadError(null);
    setAnalyzingStep(0);
  };

  const updateReportStatus = async (id: string, status: "Pending" | "In Progress" | "Resolved") => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this civic report? This action is permanent.")) return;

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.report_id !== id));
        if (selectedReport && selectedReport.report_id === id) {
          setSelectedReport(null);
        }
      }
    } catch (err) {
      console.error("Error deleting report:", err);
    }
  };

  // Filtered reports list
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.issue_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.suggested_department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === "All" || r.severity === selectedSeverity;
    const matchesStatus = selectedStatus === "All" || r.status === selectedStatus;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Count helper
  const getCounts = () => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === "Pending").length;
    const inProgress = reports.filter((r) => r.status === "In Progress").length;
    const resolved = reports.filter((r) => r.status === "Resolved").length;
    const critical = reports.filter((r) => r.severity === "Critical" || r.severity === "High").length;

    return { total, pending, inProgress, resolved, critical };
  };

  const counts = getCounts();

  // Helper colors
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

  return (
    <div className="min-h-screen bg-[#0a0a0b] font-sans text-[#e1e1e6] flex flex-col antialiased">
      {/* Upper Navigation Rail */}
      <header className="bg-[#111114] border-b border-[#26262d] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <div className="bg-[#38bdf8] text-[#0a0a0b] p-2.5 rounded-xl shadow-md flex items-center justify-center">
                <Compass className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xl text-[#e1e1e6] tracking-tight font-sans">CivicLens</span>
                  <span className="text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider">MVP</span>
                </div>
                <p className="text-xs text-[#94949e] font-medium">AI Civic Action Platform</p>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="flex space-x-1 bg-[#141417] p-1 rounded-xl border border-[#26262d]">
              <button
                id="nav-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "dashboard"
                    ? "bg-[#1a1a1e] text-[#38bdf8] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              <button
                id="nav-report"
                onClick={() => setActiveTab("report")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "report"
                    ? "bg-[#1a1a1e] text-[#38bdf8] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>File Report</span>
              </button>

              <button
                id="nav-list"
                onClick={() => setActiveTab("list")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "list"
                    ? "bg-[#1a1a1e] text-[#38bdf8] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Issue Ledger</span>
              </button>

              <button
                id="nav-map"
                onClick={() => setActiveTab("map")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === "map"
                    ? "bg-[#1a1a1e] text-[#38bdf8] border border-[#26262d] shadow-sm"
                    : "text-[#94949e] hover:text-[#e1e1e6] hover:bg-[#1a1a1e]/50"
                }`}
              >
                <Map className="h-4 w-4" />
                <span>Civic Grid</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dynamic Warning Alert for missing Gemini Key */}
        <div className="mb-6 bg-[#141417] border-l-4 border-[#38bdf8] p-4 rounded-r-xl flex items-start space-x-3 shadow-md border-y border-r border-[#26262d]">
          <Sparkles className="h-5 w-5 text-[#38bdf8] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-[#e1e1e6] text-sm">CivicLens Operational Ledger</h4>
            <p className="text-xs text-[#94949e] mt-1">
              Active full-stack connection established with SQLite database. Reports are cataloged via Gemini AI vision telemetry and routed instantly. Use the tabs above to explore public records or submit new reports.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* TAB 1: DASHBOARD OVERVIEW */}
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
                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">Total Filed</span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.total}</span>
                    <span className="text-xs text-[#94949e] font-medium">reports</span>
                  </div>
                </div>

                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#fbbf24] uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 mr-1" /> Pending
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.pending}</span>
                    <span className="text-xs text-[#94949e] font-medium">waiting</span>
                  </div>
                </div>

                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#38bdf8] uppercase tracking-wider flex items-center space-x-1">
                    <Compass className="h-3.5 w-3.5 mr-1" /> In Progress
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.inProgress}</span>
                    <span className="text-xs text-[#94949e] font-medium">active</span>
                  </div>
                </div>

                <div className="bg-[#141417] p-5 rounded-2xl border border-[#26262d] shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#34d399] uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolved
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#e1e1e6]">{counts.resolved}</span>
                    <span className="text-xs text-[#34d399] font-medium">
                      ({counts.total ? Math.round((counts.resolved / counts.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-[#451a1a] border border-[#7f1d1d] p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#f87171] uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Urgent Concerns
                  </span>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[#f87171]">{counts.critical}</span>
                    <span className="text-xs text-[#f87171]/80 font-medium">high-priority</span>
                  </div>
                </div>
              </div>

              {/* Action Promo */}
              <div className="bg-gradient-to-r from-[#18181c] to-[#141417] text-[#e1e1e6] p-8 rounded-3xl border border-[#26262d] shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div className="relative z-10 space-y-2 max-w-xl">
                  <div className="bg-[#38bdf8]/10 border border-[#38bdf8]/30 backdrop-blur-xs text-[#38bdf8] text-xs font-bold px-3 py-1 rounded-full inline-block uppercase tracking-wider">
                    Next-Gen Public Service
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e1e1e6]">Report local hazards with instant AI classification</h2>
                  <p className="text-[#94949e] text-sm sm:text-base font-light leading-relaxed">
                    Simply snap a photo of any infrastructure damage. Our Gemini AI system instantly analyzes the issue, gauges safety risks, routes a ticket, and posts to the public record.
                  </p>
                </div>
                <button
                  id="dashboard-cta-report"
                  onClick={() => setActiveTab("report")}
                  className="bg-[#38bdf8] text-[#0a0a0b] hover:bg-[#38bdf8]/90 font-semibold px-6 py-3.5 rounded-xl shadow-md hover:scale-102 active:scale-98 transition-all duration-200 relative z-10 flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>File New Issue Report</span>
                </button>
                <div className="absolute right-0 bottom-0 top-0 opacity-5 pointer-events-none">
                  <Compass className="h-96 w-96 translate-x-12 translate-y-12 rotate-12 text-[#38bdf8]" />
                </div>
              </div>

              {/* Grid content: Recent items & Departments summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activities */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-[#e1e1e6]">Recent Public Filings</h3>
                      <p className="text-xs text-[#94949e] font-medium">Real-time civic logs in SQLite ledger</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("list")}
                      className="text-xs font-semibold text-[#38bdf8] hover:text-[#38bdf8]/80 flex items-center cursor-pointer"
                    >
                      <span>View ledger</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </button>
                  </div>

                  <div className="bg-[#141417] border border-[#26262d] rounded-2xl overflow-hidden shadow-md divide-y divide-[#26262d]">
                    {loading ? (
                      <div className="p-8 text-center text-[#94949e] text-sm">Loading database ledger...</div>
                    ) : filteredReports.length === 0 ? (
                      <div className="p-8 text-center text-[#94949e] text-sm">No reports filed yet. Be the first to report!</div>
                    ) : (
                      filteredReports.slice(0, 4).map((report) => (
                        <div
                          key={report.report_id}
                          onClick={() => {
                            setSelectedReport(report);
                            setActiveTab("list");
                          }}
                          className="p-5 hover:bg-[#1a1a20] transition-colors duration-150 cursor-pointer flex space-x-4 items-start"
                        >
                          <img
                            src={report.image_path}
                            alt={report.issue_category}
                            className="h-16 w-16 rounded-xl object-cover border border-[#26262d] flex-shrink-0"
                            referrerPolicy="no-referrer"
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
                              <span className="truncate">{report.address || "Unknown coordinates"}</span>
                            </p>
                            <p className="text-xs text-[#a1a1aa] mt-2 line-clamp-2">{report.description}</p>
                            <div className="flex items-center space-x-2 mt-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(report.status)}`}>
                                {report.status}
                              </span>
                              <span className="text-[10px] text-[#71717a] font-medium">
                                {new Date(report.upload_timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Info & Routing Breakdown */}
                <div className="space-y-6">
                  <div className="bg-[#141417] border border-[#26262d] p-6 rounded-2xl shadow-md space-y-4">
                    <h3 className="font-bold text-[#e1e1e6] text-base">Department Routing Metrics</h3>
                    <p className="text-xs text-[#94949e] leading-relaxed font-medium">
                      Gemini analyzes the issue context and dynamically routes action items to the appropriate local agency.
                    </p>

                    <div className="space-y-3.5 mt-2">
                      {[
                        { name: "Department of Transportation", color: "bg-blue-600" },
                        { name: "Water Department", color: "bg-cyan-600" },
                        { name: "Sanitation Department", color: "bg-amber-600" },
                        { name: "Parks & Recreation", color: "bg-emerald-600" },
                        { name: "Department of Public Works", color: "bg-indigo-600" },
                      ].map((dept) => {
                        const count = reports.filter((r) => r.suggested_department === dept.name).length;
                        const pct = reports.length ? Math.round((count / reports.length) * 100) : 0;

                        return (
                          <div key={dept.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[#a1a1aa] truncate">{dept.name}</span>
                              <span className="text-[#e1e1e6]">{count} issues</span>
                            </div>
                            <div className="h-2 bg-[#18181c] border border-[#26262d]/50 rounded-full overflow-hidden">
                              <div className={`h-full ${dept.color} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Flow Card */}
                  <div className="bg-[#111114] border border-[#26262d] text-[#e1e1e6] p-6 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
                    <div className="bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">
                      Processing Pipeline
                    </div>
                    <h4 className="font-bold text-sm">Automated Municipal Pipeline</h4>
                    <ul className="text-xs text-[#94949e] font-light space-y-2 list-none p-0">
                      <li className="flex items-center space-x-2">
                        <span className="text-[#38bdf8] font-semibold">01.</span>
                        <span>Citizens upload raw issue snapshots</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-[#38bdf8] font-semibold">02.</span>
                        <span>Gemini Vision classifies category & priority</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-[#38bdf8] font-semibold">03.</span>
                        <span>Ticket metadata logged in SQLite ledger</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-[#38bdf8] font-semibold">04.</span>
                        <span>Status tracked from dispatch to resolution</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: FILE REPORT / IMAGE UPLOAD */}
          {activeTab === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#e1e1e6]">File a Civic Infrastructure Issue</h2>
                <p className="text-sm text-[#94949e]">Provide an image of the concern. Our AI engine will inspect the scene and handle formatting.</p>
              </div>

              {!uploadPreview ? (
                /* Upload Card Frame */
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-3 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[350px] ${
                    dragActive
                      ? "border-[#38bdf8] bg-[#1a1a20] text-[#38bdf8]"
                      : "border-[#26262d] bg-[#141417] hover:border-[#38bdf8]/50 text-[#94949e]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="bg-[#18181c] text-[#38bdf8] border border-[#26262d] p-4 rounded-2xl shadow-xs mb-4">
                    <UploadCloud className="h-10 w-10 stroke-[1.5]" />
                  </div>
                  <h3 className="font-semibold text-[#e1e1e6] text-lg">Drag & drop your image here</h3>
                  <p className="text-xs text-[#94949e] mt-2">Supports JPG, PNG, WEBP, up to 10MB</p>
                  <div className="mt-6">
                    <span className="bg-[#38bdf8] text-[#0a0a0b] font-semibold px-4.5 py-2.5 rounded-xl shadow-md hover:bg-[#38bdf8]/90 transition-all duration-200">
                      Browse Files
                    </span>
                  </div>
                </div>
              ) : (
                /* Preview and AI Classification Section */
                <div className="bg-[#141417] border border-[#26262d] rounded-3xl overflow-hidden shadow-md grid grid-cols-1 md:grid-cols-2">
                  {/* Left Column: Image with optional Scan Animation */}
                  <div className="bg-slate-950 flex flex-col justify-center relative min-h-[300px]">
                    <img
                      src={uploadPreview}
                      alt="Uploaded civic preview"
                      className={`max-h-[450px] w-full object-contain ${analyzing ? "opacity-70" : ""}`}
                    />

                    {analyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/80 text-[#e1e1e6] text-center">
                        {/* Scan Line animation */}
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_15px_#38bdf8] animate-[pulse_1.5s_infinite] top-1/4 animate-bounce" />

                        <div className="bg-[#111114]/95 border border-[#26262d] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative z-10">
                          {/* Spinner */}
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#38bdf8] border-t-transparent" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#38bdf8] tracking-wider">AI Vision Dispatch</span>
                            <h4 className="font-bold text-sm text-[#e1e1e6] mt-1">Analyzing Scene Context</h4>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-[#94949e] font-light truncate">
                              {stepperMessages[analyzingStep]}
                            </div>
                            {/* Stepper bar indicator */}
                            <div className="h-1.5 bg-[#18181c] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#38bdf8] transition-all duration-500 rounded-full"
                                style={{ width: `${((analyzingStep + 1) / stepperMessages.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Change image trigger */}
                    {!analyzing && !analysisResult && (
                      <button
                        onClick={resetUploadState}
                        className="absolute top-4 right-4 bg-slate-900/90 hover:bg-slate-900 text-white p-2 rounded-full shadow-md cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Right Column: AI Analysis details */}
                  <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    {/* Scenario 1: Ready to Scan */}
                    {!analyzing && !analysisResult && !uploadError && (
                      <div className="space-y-6 h-full flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="bg-[#112233] border border-[#1e3a8a] p-4 rounded-2xl flex items-start space-x-3">
                            <Sparkles className="h-5 w-5 text-[#38bdf8] flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-[#e1e1e6] text-sm">Image Uploaded</h4>
                              <p className="text-xs text-[#94949e] leading-relaxed mt-1">
                                Click below to submit this image to Gemini AI. It will dynamically inspect the context, extract categories, suggest departments, and locate the issue.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-xs font-bold text-[#94949e] uppercase tracking-wider">File Metadata</span>
                            <p className="text-xs text-[#94949e] font-mono">
                              Name: {uploadFile?.name}<br />
                              Size: {uploadFile ? (uploadFile.size / 1024 / 1024).toFixed(2) : 0} MB
                            </p>
                          </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            onClick={resetUploadState}
                            className="flex-1 bg-[#1a1a1e] hover:bg-[#26262d] text-[#e1e1e6] border border-[#26262d] font-semibold px-4 py-3 rounded-xl text-center cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            id="submit-ai-analysis"
                            onClick={triggerUpload}
                            className="flex-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0a0a0b] font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-101 active:scale-99 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Sparkles className="h-4 w-4 stroke-[2.5]" />
                            <span>Run AI Classification</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Scenario 2: Error State */}
                    {uploadError && (
                      <div className="space-y-6 flex flex-col justify-between h-full">
                        <div className="space-y-3">
                          <div className="bg-[#451a1a] border border-[#7f1d1d] p-5 rounded-2xl flex items-start space-x-3 text-[#f87171]">
                            <AlertTriangle className="h-6 w-6 text-[#ef4444] flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-sm">AI Scan Operation Failed</h4>
                              <p className="text-xs text-[#f87171] mt-1 leading-relaxed">
                                {uploadError}
                              </p>
                            </div>
                          </div>

                          <div className="bg-[#18181c] p-4 rounded-xl border border-[#26262d]">
                            <h5 className="text-xs font-bold text-[#e1e1e6] mb-1 flex items-center">
                              <Info className="h-3.5 w-3.5 mr-1 text-[#38bdf8]" /> Troubleshoot Guidelines
                            </h5>
                            <p className="text-[11px] text-[#94949e] leading-relaxed font-light">
                              Ensure that <code>GEMINI_API_KEY</code> is correctly set in your environment or Settings panel. The API must also receive a valid, recognizable image structure.
                            </p>
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={resetUploadState}
                            className="flex-1 bg-[#1a1a1e] hover:bg-[#26262d] text-[#e1e1e6] border border-[#26262d] font-semibold px-4 py-3 rounded-xl text-center cursor-pointer"
                          >
                            Try Another Image
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Scenario 3: Analysis Success Output */}
                    {analysisResult && (
                      <div className="space-y-6 h-full flex flex-col justify-between">
                        <div className="space-y-5">
                          <div className="flex items-center space-x-2 text-[#34d399]">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-bold text-sm">Analysis Ticket Created</span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[#94949e] tracking-wider">Detected Issue Category</span>
                              <h3 className="text-lg font-extrabold text-[#e1e1e6] leading-tight">
                                {analysisResult.issue_category}
                              </h3>
                            </div>

                            <div className="flex space-x-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getSeverityBadgeClass(analysisResult.severity)}`}>
                                {analysisResult.severity} Severity
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#1a1a1e] text-[#94949e] border border-[#26262d]">
                                Ticket Filed
                              </span>
                            </div>

                            <div className="space-y-1 text-xs">
                              <span className="font-bold text-[#94949e]">Suggested Action Route:</span>
                              <div className="flex items-center text-[#e1e1e6] bg-[#18181c] p-2.5 border border-[#26262d] rounded-xl space-x-2">
                                <Building2 className="h-4 w-4 text-[#38bdf8]" />
                                <span className="font-semibold">{analysisResult.suggested_department}</span>
                              </div>
                            </div>

                            {analysisResult.address && (
                              <div className="space-y-1 text-xs">
                                <span className="font-bold text-[#94949e]">Determined Incident Location:</span>
                                <div className="flex items-center text-[#e1e1e6] bg-[#18181c] p-2.5 border border-[#26262d] rounded-xl space-x-2">
                                  <MapPin className="h-4 w-4 text-[#38bdf8]" />
                                  <span className="font-semibold">{analysisResult.address}</span>
                                </div>
                              </div>
                            )}

                            <div className="space-y-1">
                              <span className="text-xs font-bold text-[#94949e]">AI Description & Context:</span>
                              <p className="text-xs text-[#e1e1e6] leading-relaxed font-light p-3 bg-[#18181c] rounded-xl border border-[#26262d]">
                                {analysisResult.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-3 pt-4 border-t border-[#26262d]">
                          <button
                            onClick={resetUploadState}
                            className="flex-1 bg-[#1a1a1e] hover:bg-[#26262d] text-[#e1e1e6] border border-[#26262d] font-semibold px-4 py-3 rounded-xl text-center cursor-pointer"
                          >
                            File Another
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(analysisResult);
                              setActiveTab("list");
                            }}
                            className="flex-1 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0a0a0b] font-semibold px-4 py-3 rounded-xl text-center shadow-xs cursor-pointer"
                          >
                            View ledger Detail
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: ALL ISSUES LEDGER LIST */}
          {activeTab === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Filter controls */}
              <div className="bg-[#141417] border border-[#26262d] p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#e1e1e6]">Civic Ledger</h2>
                    <p className="text-xs text-[#94949e] font-medium">SQLite backend synchronization registry</p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                        viewMode === "grid" ? "bg-[#1a1a1e] border-[#38bdf8] text-[#38bdf8]" : "bg-[#141417] border-[#26262d] text-[#94949e] hover:text-[#e1e1e6]"
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                        viewMode === "list" ? "bg-[#1a1a1e] border-[#38bdf8] text-[#38bdf8]" : "bg-[#141417] border-[#26262d] text-[#94949e] hover:text-[#e1e1e6]"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Filters grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94949e]" />
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2.5 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#38bdf8] focus:bg-[#1a1a1e]"
                    />
                  </div>

                  {/* Filter Severity */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-[#94949e] flex-shrink-0">Severity:</span>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value as FilterSeverity)}
                      className="py-2.5 px-3 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#38bdf8] focus:bg-[#1a1a1e] cursor-pointer"
                    >
                      <option value="All">All Levels</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Filter Status */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-[#94949e] flex-shrink-0">Status:</span>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as FilterStatus)}
                      className="py-2.5 px-3 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#38bdf8] focus:bg-[#1a1a1e] cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ledger Container */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Ledger Listing */}
                <div className="lg:col-span-2">
                  {loading ? (
                    <div className="bg-[#141417] p-16 text-center border border-[#26262d] rounded-3xl text-[#94949e] shadow-md">
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#38bdf8] border-t-transparent mx-auto mb-3" />
                      <span>Syncing ledger...</span>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="bg-[#141417] p-16 text-center border border-[#26262d] rounded-3xl text-[#94949e] shadow-md">
                      <FileText className="h-10 w-10 text-[#26262d] mx-auto mb-3" />
                      <p className="font-semibold text-[#e1e1e6]">No tickets found</p>
                      <p className="text-xs text-[#94949e] mt-1">Try adjusting search keywords or filters.</p>
                    </div>
                  ) : viewMode === "grid" ? (
                    /* Grid Layout */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredReports.map((report) => (
                        <div
                          key={report.report_id}
                          onClick={() => setSelectedReport(report)}
                          className={`bg-[#141417] border p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-101 flex flex-col justify-between space-y-4 ${
                            selectedReport?.report_id === report.report_id ? "border-[#38bdf8] ring-1 ring-[#38bdf8]" : "border-[#26262d]"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-950 border border-[#26262d]">
                              <img
                                src={report.image_path}
                                alt={report.issue_category}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-2 right-2 flex space-x-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-md ${getSeverityBadgeClass(report.severity)}`}>
                                  {report.severity}
                                </span>
                              </div>
                            </div>

                            <div>
                              <h3 className="font-bold text-[#e1e1e6] text-sm truncate">{report.issue_category}</h3>
                              <p className="text-[11px] text-[#94949e] font-medium mt-0.5 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span className="truncate">{report.address || "Simulated location"}</span>
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
                    /* List Layout */
                    <div className="bg-[#141417] border border-[#26262d] rounded-3xl overflow-hidden divide-y divide-[#26262d] shadow-md">
                      {filteredReports.map((report) => (
                        <div
                          key={report.report_id}
                          onClick={() => setSelectedReport(report)}
                          className={`p-4 sm:p-5 cursor-pointer transition-colors flex space-x-4 items-center hover:bg-[#1a1a20]/50 ${
                            selectedReport?.report_id === report.report_id ? "bg-[#1a1a20]" : ""
                          }`}
                        >
                          <img
                            src={report.image_path}
                            alt={report.issue_category}
                            className="h-14 w-14 rounded-lg object-cover border border-[#26262d] flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
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
                            <p className="text-xs text-[#71717a] mt-2">
                              Filed: {new Date(report.upload_timestamp).toLocaleDateString()} • {report.suggested_department}
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
                </div>                {/* Detail Panel */}
                <div className="bg-[#141417] border border-[#26262d] p-6 rounded-2xl shadow-sm sticky top-24 space-y-6">
                  {selectedReport ? (
                    <div className="space-y-6">
                      {/* Top Action Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-[#38bdf8] font-extrabold uppercase tracking-wider">Ticket Ledger</span>
                          <h3 className="font-extrabold text-[#e1e1e6] text-lg leading-tight mt-0.5">{selectedReport.issue_category}</h3>
                        </div>
                        <button
                          onClick={() => deleteReport(selectedReport.report_id)}
                          className="bg-[#18181c] hover:bg-[#451212] text-[#94949e] hover:text-[#f87171] p-2 rounded-xl border border-[#26262d] transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Image Preview */}
                      <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-950 border border-[#26262d]">
                        <img
                          src={selectedReport.image_path}
                          alt={selectedReport.issue_category}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Fields */}
                      <div className="space-y-4 text-xs">
                        {/* Status update selector */}
                        <div className="space-y-1.5">
                          <label className="text-[#94949e] font-bold uppercase text-[10px] tracking-wider">Dispatch Status</label>
                          <select
                            value={selectedReport.status}
                            onChange={(e) => updateReportStatus(selectedReport.report_id, e.target.value as any)}
                            className="py-2 px-3 w-full bg-[#18181c] border border-[#26262d] text-[#e1e1e6] text-sm font-semibold rounded-xl focus:outline-none focus:ring-1 focus:ring-[#38bdf8] focus:bg-[#1a1a1e] cursor-pointer"
                          >
                            <option value="Pending">🕒 Pending Review</option>
                            <option value="In Progress">🛠️ In Progress</option>
                            <option value="Resolved">✅ Resolved</option>
                          </select>
                        </div>

                        {/* Metadata block */}
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

                        {/* Description */}
                        <div className="space-y-1">
                          <span className="text-[#94949e] font-bold uppercase text-[9px] tracking-wider">Issue Description</span>
                          <p className="text-[#e1e1e6] leading-relaxed bg-[#18181c] p-3 rounded-xl border border-[#26262d] font-light">
                            {selectedReport.description}
                          </p>
                        </div>

                        {/* Department Routing */}
                        <div className="space-y-1">
                          <span className="text-[#94949e] font-bold uppercase text-[9px] tracking-wider">Assigned Department</span>
                          <div className="flex items-center space-x-2 bg-[#18181c] p-3 rounded-xl border border-[#26262d]">
                            <Briefcase className="h-4 w-4 text-[#38bdf8]" />
                            <span className="text-[#e1e1e6] font-semibold">{selectedReport.suggested_department}</span>
                          </div>
                        </div>

                        {/* Location details */}
                        {selectedReport.address && (
                          <div className="space-y-1">
                            <span className="text-[#94949e] font-bold uppercase text-[9px] tracking-wider">Geographic Address</span>
                            <div className="flex items-center space-x-2 bg-[#18181c] p-3 rounded-xl border border-[#26262d]">
                              <MapPin className="h-4 w-4 text-[#38bdf8]" />
                              <span className="text-[#e1e1e6] font-semibold">{selectedReport.address}</span>
                            </div>
                            {selectedReport.lat && selectedReport.lng && (
                              <span className="text-[10px] text-[#71717a] block font-mono pl-1">
                                Coordinates: {selectedReport.lat.toFixed(5)}, {selectedReport.lng.toFixed(5)}
                              </span>
                            )}
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

          {/* TAB 4: MUNICIPAL GRID MAP */}
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
                {/* Visual Plotting Box */}
                <div className="lg:col-span-3 bg-slate-950 border border-slate-800 p-4 rounded-3xl shadow-xl relative min-h-[500px] flex flex-col justify-between overflow-hidden">
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                  {/* Simulated Roads & Map Elements */}
                  <div className="absolute inset-0 pointer-events-none border border-slate-900">
                    <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-slate-800/50" />
                    <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-slate-800/50" />
                    <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-slate-800/50" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-0.5 bg-slate-800/50" />
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800/20 rotate-12" />
                    <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-slate-800/20 -rotate-12" />
                  </div>

                  {/* Coordinates Map Canvas */}
                  <div className="relative flex-1">
                    {reports.map((report) => {
                      // Project coordinates onto schematic map
                      // San Francisco coordinates bounds: lat: 37.70 to 37.82, lng: -122.52 to -122.36
                      const lat = report.lat || 37.78;
                      const lng = report.lng || -122.42;

                      // Map coordinate bounds to percentage positions
                      const latMin = 37.70;
                      const latMax = 37.82;
                      const lngMin = -122.52;
                      const lngMax = -122.36;

                      const topPct = 100 - ((lat - latMin) / (latMax - latMin)) * 100;
                      const leftPct = ((lng - lngMin) / (lngMax - lngMin)) * 100;

                      // Clamp coordinates to safe viewing grid margins (10% to 90%)
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
                          {/* Pulsing Pin Indicator */}
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 focus:outline-none cursor-pointer"
                          >
                            <span className={`absolute inline-flex h-6 w-6 rounded-full animate-ping opacity-25 ${dotColor}`} />
                            <span className={`relative inline-flex rounded-full h-4.5 w-4.5 border-2 border-white shadow-lg ${dotColor}`} />
                          </button>

                          {/* Hover Tooltip tooltip details */}
                          <div className="absolute left-1/2 bottom-5 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 w-52 z-30 space-y-1.5 text-center">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                              {report.severity} Priority
                            </span>
                            <h4 className="font-bold text-xs text-white truncate">{report.issue_category}</h4>
                            <p className="text-[10px] text-slate-300 truncate">{report.address}</p>
                            <p className="text-[9px] text-slate-400 font-mono">
                              Status: {report.status}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calibration Grid Indicators */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-3 relative z-10 pointer-events-none">
                    <span>GRID RADAR ACTIVE</span>
                    <span>BOUNDS: SF MUNICIPALITY COORDS</span>
                    <span>MAPPED LEDGER: {reports.length} NODES</span>
                  </div>
                </div>

                {/* Right panel coordinate logs */}
                <div className="bg-[#141417] border border-[#26262d] p-6 rounded-3xl shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-[#e1e1e6] text-base">Node Registry</h3>
                    <p className="text-xs text-[#94949e] font-medium mt-0.5">Click any node to focus ticket details</p>
                  </div>

                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                    {reports.map((report) => (
                      <div
                        key={report.report_id}
                        onClick={() => {
                          setSelectedReport(report);
                          setActiveTab("list");
                        }}
                        className={`p-3 border rounded-xl cursor-pointer transition-all duration-150 flex items-center space-x-3 hover:bg-[#18181c] ${
                          selectedReport?.report_id === report.report_id ? "border-[#38bdf8] bg-[#1a1a20]" : "border-[#26262d] bg-[#141417]"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full flex-shrink-0 ${
                          report.severity === "Critical"
                            ? "bg-rose-500"
                            : report.severity === "High"
                            ? "bg-amber-500"
                            : report.severity === "Medium"
                            ? "bg-blue-500"
                            : "bg-slate-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-[#e1e1e6] truncate leading-tight">
                            {report.issue_category}
                          </h4>
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

      {/* Municipal Footer */}
      <footer className="bg-[#0a0a0b] border-t border-[#1f1f23] py-6 mt-12 text-center">
        <p className="text-xs text-[#71717a] font-medium">
          © {new Date().getFullYear()} CivicLens. Running full-stack React-Vite & SQLite instance on port 3000. All data locally persisted.
        </p>
      </footer>
    </div>
  );
}
