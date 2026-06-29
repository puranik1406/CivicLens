import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Report } from "../../types";
import {
  getSeverityBadgeClass,
  getStatusBadgeClass,
  getSeverityDot,
  formatDate,
} from "../../utils/reportHelpers";

const CitizenHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then(r => r.json())
      .then(data => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // My reports tracked in localStorage
  const myIds: string[] = JSON.parse(
    localStorage.getItem(`civiclens_my_reports_${user?.id}`) ?? "[]"
  );
  const myReports = reports.filter(r => myIds.includes(r.report_id));

  const total     = myReports.length;
  const pending   = myReports.filter(r => r.status === "Pending").length;
  const inProg    = myReports.filter(r => r.status === "In Progress").length;
  const resolved  = myReports.filter(r => r.status === "Resolved").length;

  const recentAll = reports.slice(0, 5);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* ── WELCOME BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative bg-gradient-to-br from-[#111822] via-[#0f1f2f] to-[#0a0a0b] border border-[#1e3a52] rounded-3xl p-7 overflow-hidden"
      >
        {/* glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#38bdf8]/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#38bdf8]/4 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Compass className="h-5 w-5 text-[#38bdf8]" />
              <span className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">
                CivicLens Portal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#e1e1e6] leading-tight tracking-tight">
              {greeting},{" "}
              <span className="text-[#38bdf8]">
                {user?.id?.split("@")[0] ?? "Citizen"}
              </span>{" "}
              👋
            </h1>
            <p className="text-sm text-[#71717a] max-w-md leading-relaxed">
              Snap a photo of any civic infrastructure issue. Our Gemini AI
              engine will classify, prioritise and route it to the right
              department instantly.
            </p>
          </div>

          <button
            id="citizen-quick-report-btn"
            onClick={() => navigate("/citizen/report")}
            className="flex items-center space-x-2.5 bg-[#38bdf8] hover:bg-[#38bdf8]/90 active:scale-95 text-[#0a0a0b] font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-[#38bdf8]/20 transition-all duration-200 cursor-pointer self-start md:self-auto whitespace-nowrap"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>File New Report</span>
          </button>
        </div>
      </motion.div>

      {/* ── MY STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "My Reports",
            value: total,
            icon: Activity,
            color: "text-[#e1e1e6]",
            iconColor: "text-[#94949e]",
            bg: "bg-[#111114]",
          },
          {
            label: "Pending",
            value: pending,
            icon: Clock,
            color: "text-[#fbbf24]",
            iconColor: "text-[#fbbf24]",
            bg: "bg-[#111114]",
          },
          {
            label: "In Progress",
            value: inProg,
            icon: TrendingUp,
            color: "text-[#38bdf8]",
            iconColor: "text-[#38bdf8]",
            bg: "bg-[#111114]",
          },
          {
            label: "Resolved",
            value: resolved,
            icon: CheckCircle2,
            color: "text-[#34d399]",
            iconColor: "text-[#34d399]",
            bg: "bg-[#111114]",
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className={`${s.bg} border border-[#26262d] rounded-2xl p-5 flex flex-col space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                  {s.label}
                </span>
                <Icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <span className={`text-3xl font-extrabold tracking-tight ${s.color}`}>
                {loading ? "—" : s.value}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            id: "qaction-report",
            title: "Report an Issue",
            desc: "Upload an image for instant AI analysis",
            icon: Plus,
            path: "/citizen/report",
            color: "text-[#38bdf8]",
            border: "hover:border-[#38bdf8]/40",
            iconBg: "bg-[#38bdf8]/10",
          },
          {
            id: "qaction-myreports",
            title: "My Reports",
            desc: "Track all complaints you've submitted",
            icon: Activity,
            path: "/citizen/my-reports",
            color: "text-[#a855f7]",
            border: "hover:border-[#a855f7]/40",
            iconBg: "bg-[#a855f7]/10",
          },
          {
            id: "qaction-profile",
            title: "My Profile",
            desc: "View your account details and stats",
            icon: Sparkles,
            path: "/citizen/profile",
            color: "text-[#34d399]",
            border: "hover:border-[#34d399]/40",
            iconBg: "bg-[#34d399]/10",
          },
        ].map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              id={a.id}
              onClick={() => navigate(a.path)}
              className={`bg-[#111114] border border-[#26262d] ${a.border} rounded-2xl p-5 text-left flex items-start space-x-4 transition-all duration-200 hover:bg-[#18181c] cursor-pointer group`}
            >
              <div className={`${a.iconBg} p-2.5 rounded-xl`}>
                <Icon className={`h-5 w-5 ${a.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${a.color}`}>{a.title}</p>
                <p className="text-xs text-[#52525b] mt-0.5 leading-relaxed">{a.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#3f3f46] group-hover:text-[#71717a] transition-colors mt-1 flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* ── RECENT COMPLAINTS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-[#e1e1e6]">
              Recent Community Reports
            </h2>
            <p className="text-xs text-[#52525b] mt-0.5">
              Latest civic issues from all residents
            </p>
          </div>
          <button
            onClick={() => navigate("/citizen/my-reports")}
            className="flex items-center space-x-1 text-xs font-semibold text-[#38bdf8] hover:text-[#38bdf8]/70 transition-colors cursor-pointer"
          >
            <span>See mine</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="bg-[#111114] border border-[#26262d] rounded-2xl overflow-hidden divide-y divide-[#1e1e24]">
          {loading ? (
            <div className="p-10 text-center">
              <div className="h-6 w-6 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#52525b]">Loading civic ledger…</p>
            </div>
          ) : recentAll.length === 0 ? (
            <div className="p-10 text-center">
              <AlertTriangle className="h-8 w-8 text-[#26262d] mx-auto mb-3" />
              <p className="text-sm text-[#52525b]">No reports yet. Be the first!</p>
            </div>
          ) : (
            recentAll.map(r => (
              <div
                key={r.report_id}
                className="flex items-start space-x-4 p-4 hover:bg-[#18181c] transition-colors"
              >
                <img
                  src={r.image_path}
                  alt={r.issue_category}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-xl object-cover border border-[#26262d] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-[#e1e1e6] truncate">
                      {r.issue_category}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${getSeverityBadgeClass(
                        r.severity
                      )}`}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#52525b] flex items-center mt-0.5">
                    <MapPin className="h-3 w-3 mr-1" />
                    {r.address ?? "Location pending"}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                    <span className="text-[10px] text-[#3f3f46]">
                      {formatDate(r.upload_timestamp)}
                    </span>
                  </div>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5 ${getSeverityDot(
                    r.severity
                  )}`}
                />
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CitizenHome;
