import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Search,
  Filter,
  MapPin,
  Clock,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  AlertTriangle,
  X,
  Compass,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Report } from "../../types";
import {
  getSeverityBadgeClass,
  getStatusBadgeClass,
  getEstimatedTime,
  formatDate,
  formatDateTime,
} from "../../utils/reportHelpers";

// Helpers to extract/mock District and Ward for Citizen My Reports cards
const getDistrictAndWard = (address: string | undefined, id: string) => {
  const addr = address || "";
  let district = "Hyderabad";
  const known = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Delhi", "San Francisco"];
  for (const k of known) {
    if (addr.toLowerCase().includes(k.toLowerCase())) {
      district = k;
      break;
    }
  }
  // Generate a consistent ward number based on string hashing the ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const wardNum = Math.abs(hash % 45) + 1;
  return { district, ward: `Ward ${wardNum}` };
};

const MyReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/reports")
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter only reports submitted by this user
  const myIds: string[] = JSON.parse(
    localStorage.getItem(`civiclens_my_reports_${user?.id}`) ?? "[]"
  );
  const myReports = reports.filter(r => myIds.includes(r.report_id));

  // Filter logic
  const filtered = myReports.filter(r => {
    const matchesSearch =
      r.issue_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.suggested_department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === "All" || r.severity === severityFilter;
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-[#a855f7]/10 p-2.5 rounded-2xl border border-[#a855f7]/20">
            <FileText className="h-6 w-6 text-[#a855f7]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e1e1e6]">My Filed Reports</h2>
            <p className="text-xs text-[#52525b]">Manage and track all issues submitted under your citizen profile</p>
          </div>
        </div>
        <span className="text-xs bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20 px-3 py-1.5 rounded-xl font-bold">
          {myReports.length} Reports Total
        </span>
      </div>

      {/* Search & Filter Panel */}
      <div className="bg-[#111114] border border-[#26262d] rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
          <input
            id="citizen-reports-search"
            type="text"
            placeholder="Search by category, description, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181c] border border-[#26262d] text-sm text-[#e1e1e6] placeholder-[#52525b] rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#38bdf8] transition-colors"
          />
        </div>

        <div className="flex gap-2.5">
          <select
            id="citizen-reports-severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#18181c] border border-[#26262d] text-xs text-[#94949e] font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#38bdf8] cursor-pointer"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            id="citizen-reports-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#18181c] border border-[#26262d] text-xs text-[#94949e] font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#38bdf8] cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="p-16 text-center">
          <div className="h-8 w-8 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#52525b]">Syncing with ledger...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111114] border border-[#26262d] rounded-3xl p-16 text-center">
          <AlertTriangle className="h-10 w-10 text-[#26262d] mx-auto mb-3" />
          <p className="text-sm text-[#94949e] font-medium">No matching reports found</p>
          <p className="text-xs text-[#52525b] mt-1">Try resetting filters or file a new issue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(r => {
            const { district, ward } = getDistrictAndWard(r.address, r.report_id);
            return (
              <motion.div
                key={r.report_id}
                layoutId={`card-${r.report_id}`}
                onClick={() => setSelectedReport(r)}
                className="bg-[#111114] border border-[#26262d] hover:border-[#38bdf8]/35 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:bg-[#151518] group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-[#0a0a0c] overflow-hidden">
                    <img
                      src={r.image_path}
                      alt={r.issue_category}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeClass(r.severity)}`}>
                        {r.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3.5">
                    <div>
                      <h4 className="font-bold text-sm text-[#e1e1e6] line-clamp-1 group-hover:text-[#38bdf8] transition-colors">
                        {r.issue_category}
                      </h4>
                      <p className="text-[10px] text-[#52525b] font-mono mt-0.5">{r.report_id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-[#18181c] border border-[#26262d]/60 rounded-xl p-3 text-[11px] text-[#94949e]">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">District</span>
                        <span className="font-semibold text-[#e1e1e6]">{district}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">Ward</span>
                        <span className="font-semibold text-[#e1e1e6]">{ward}</span>
                      </div>
                      <div className="space-y-0.5 col-span-2 border-t border-[#26262d] pt-1.5 mt-0.5">
                        <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">Department</span>
                        <div className="flex items-center space-x-1 mt-0.5 text-[#38bdf8]">
                          <Building2 className="h-3 w-3" />
                          <span className="font-semibold truncate">{r.suggested_department}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#26262d] flex justify-between items-center text-[10px] text-[#52525b]">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(r.upload_timestamp)}
                  </span>
                  <span className="flex items-center text-[#38bdf8] font-bold group-hover:translate-x-0.5 transition-transform">
                    View Details
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <AnimatePresence>
        {selectedReport && (() => {
          const { district, ward } = getDistrictAndWard(selectedReport.address, selectedReport.report_id);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000000de] backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedReport(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#111114] border border-[#26262d] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-[#26262d] flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#38bdf8]">{selectedReport.report_id}</span>
                    <h3 className="text-base font-extrabold text-[#e1e1e6] mt-0.5">{selectedReport.issue_category}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1.5 bg-[#18181c] hover:bg-[#26262d] border border-[#26262d] rounded-xl text-[#94949e] hover:text-[#e1e1e6] transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Photo details */}
                  <div className="bg-[#0a0a0c] border border-[#26262d] rounded-2xl overflow-hidden h-64 relative">
                    <img
                      src={selectedReport.image_path}
                      alt={selectedReport.issue_category}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Info table */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#18181c] border border-[#26262d] rounded-xl p-3 text-center">
                      <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">Severity</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block mt-1 ${getSeverityBadgeClass(selectedReport.severity)}`}>
                        {selectedReport.severity}
                      </span>
                    </div>

                    <div className="bg-[#18181c] border border-[#26262d] rounded-xl p-3 text-center">
                      <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">Status</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block mt-1 ${getStatusBadgeClass(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                    </div>

                    <div className="bg-[#18181c] border border-[#26262d] rounded-xl p-3 text-center">
                      <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">District</span>
                      <span className="text-xs font-bold text-[#e1e1e6] block mt-1.5">{district}</span>
                    </div>

                    <div className="bg-[#18181c] border border-[#26262d] rounded-xl p-3 text-center">
                      <span className="text-[9px] text-[#52525b] uppercase font-bold tracking-wider block">Ward</span>
                      <span className="text-xs font-bold text-[#e1e1e6] block mt-1.5">{ward}</span>
                    </div>
                  </div>

                  {/* Dept & Location details */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Assigned Agency</span>
                      <div className="flex items-center space-x-2 bg-[#18181c] border border-[#26262d] px-3.5 py-2.5 rounded-xl text-xs text-[#e1e1e6]">
                        <Building2 className="h-4 w-4 text-[#38bdf8]" />
                        <span className="font-semibold">{selectedReport.suggested_department}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Incident Location</span>
                        <div className="grid gap-3 rounded-2xl border border-[#26262d] bg-[#18181c] p-4 text-xs text-[#e1e1e6]">
                          {selectedReport.address && (
                            <div className="rounded-2xl bg-[#111118] p-3">
                              <p className="text-[11px] text-[#71717a] uppercase tracking-[0.18em] mb-2">Address</p>
                              <p className="font-semibold text-[#e1e1e6]">{selectedReport.address}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-[#111118] p-3">
                              <p className="text-[10px] text-[#71717a] uppercase tracking-[0.18em]">District</p>
                              <p className="font-semibold text-[#e1e1e6] mt-2">{selectedReport.district || "Unknown"}</p>
                            </div>
                            <div className="rounded-2xl bg-[#111118] p-3">
                              <p className="text-[10px] text-[#71717a] uppercase tracking-[0.18em]">Ward</p>
                              <p className="font-semibold text-[#e1e1e6] mt-2">{selectedReport.ward || "Unknown"}</p>
                            </div>
                            <div className="rounded-2xl bg-[#111118] p-3">
                              <p className="text-[10px] text-[#71717a] uppercase tracking-[0.18em]">City</p>
                              <p className="font-semibold text-[#e1e1e6] mt-2">{selectedReport.city || "Unknown"}</p>
                            </div>
                            <div className="rounded-2xl bg-[#111118] p-3">
                              <p className="text-[10px] text-[#71717a] uppercase tracking-[0.18em]">Pincode</p>
                              <p className="font-semibold text-[#e1e1e6] mt-2">{selectedReport.pincode || "Unknown"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedReport.lat && selectedReport.lng && (
                        <div className="overflow-hidden rounded-3xl border border-[#26262d] bg-[#0b0b10] p-4">
                          <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-[0.22em] text-[#71717a]">
                            <span>Location preview</span>
                            <span>{`${selectedReport.lat.toFixed(4)}, ${selectedReport.lng.toFixed(4)}`}</span>
                          </div>
                          <div className="relative h-40 rounded-3xl bg-[#111119] overflow-hidden border border-[#23232d]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.12),_transparent_38%)]" />
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.08),rgba(16,24,40,0.03))]" />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-[#e1e1e6] text-[10px]">
                              <div className="h-3 w-3 rounded-full bg-[#38bdf8] shadow-[0_0_0_8px_rgba(56,189,248,0.2)]" />
                              <span className="mt-2">Complaint location</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Created Date</span>
                        <div className="bg-[#18181c] border border-[#26262d] px-3.5 py-2.5 rounded-xl text-xs text-[#94949e]">
                          {formatDateTime(selectedReport.upload_timestamp)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Estimated response time</span>
                        <div className="bg-[#18181c] border border-[#26262d] px-3.5 py-2.5 rounded-xl text-xs text-[#fbbf24] flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-semibold">{getEstimatedTime(selectedReport.severity)}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI details description */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">Gemini AI Context & Scene Details</span>
                      <p className="text-xs text-[#94949e] leading-relaxed p-4 bg-[#18181c] border border-[#26262d] rounded-xl font-light">
                        {selectedReport.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#26262d] flex justify-end">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="bg-[#18181c] hover:bg-[#26262d] border border-[#26262d] text-[#e1e1e6] font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Close View
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default MyReports;
