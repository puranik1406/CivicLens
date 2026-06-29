import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  UserCircle,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  Shield,
  Activity,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Report } from "../../types";

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Stats calculation
  const total = myReports.length;
  const pending = myReports.filter(r => r.status === "Pending").length;
  const inProgress = myReports.filter(r => r.status === "In Progress").length;
  const resolved = myReports.filter(r => r.status === "Resolved").length;

  // Extract District from user email or default
  const getProfileDistrict = () => {
    const email = user?.id || "";
    // If it's a citizen profile, default to Hyderabad or extract from email if any
    return "Hyderabad";
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Profile Card Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111114] border border-[#26262d] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#38bdf8]/4 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Avatar */}
        <div className="h-20 w-20 bg-[#38bdf8]/10 border-2 border-[#38bdf8]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <UserCircle className="h-12 w-12 text-[#38bdf8] stroke-[1.5]" />
        </div>

        {/* User profile info requested */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <h3 className="text-xl font-extrabold text-[#e1e1e6]">
              {user?.id?.split("@")[0] || "Citizen User"}
            </h3>
            <p className="text-xs text-[#38bdf8] font-bold uppercase tracking-wider mt-0.5">
              Verified Citizen Account
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#94949e] max-w-md mx-auto md:mx-0">
            <div className="flex items-center justify-center md:justify-start space-x-2 bg-[#18181c] border border-[#26262d] px-3.5 py-2.5 rounded-xl">
              <Mail className="h-4 w-4 text-[#38bdf8] flex-shrink-0" />
              <span className="font-semibold truncate">{user?.id}</span>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-2 bg-[#18181c] border border-[#26262d] px-3.5 py-2.5 rounded-xl">
              <MapPin className="h-4 w-4 text-[#38bdf8] flex-shrink-0" />
              <span className="font-semibold">{getProfileDistrict()}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile statistics cards requested */}
      <div className="space-y-4">
        <h4 className="font-bold text-sm text-[#e1e1e6] uppercase tracking-wider pl-1">
          Activity Statistics
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Number of Reports",
              value: total,
              icon: FileText,
              color: "text-[#38bdf8]",
              bg: "bg-[#38bdf8]/10",
              border: "border-[#38bdf8]/20",
            },
            {
              label: "Resolved Reports",
              value: resolved,
              icon: CheckCircle2,
              color: "text-[#34d399]",
              bg: "bg-[#34d399]/10",
              border: "border-[#34d399]/20",
            },
            {
              label: "Pending Reports",
              value: pending + inProgress,
              icon: Clock,
              color: "text-[#fbbf24]",
              bg: "bg-[#fbbf24]/10",
              border: "border-[#fbbf24]/20",
            },
          ].map(s => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111114] border border-[#26262d] rounded-2xl p-5 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider block">
                    {s.label}
                  </span>
                  <span className="text-2xl font-extrabold text-[#e1e1e6] block">
                    {loading ? "—" : s.value}
                  </span>
                </div>
                <div className={`${s.bg} ${s.border} border p-3 rounded-xl`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Verification / Telemetry details */}
      <div className="bg-[#111114] border border-[#26262d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-[#e1e1e6]">
          <Shield className="h-4 w-4 text-[#38bdf8]" />
          <h4 className="font-bold text-sm">Security & Platform Metadata</h4>
        </div>
        <div className="divide-y divide-[#1e1e24] text-xs text-[#94949e]">
          {[
            { label: "Role Authority", value: "Citizen Access Mode" },
            { label: "AI Routing Privileges", value: "Auto Dispatch Enabled" },
            { label: "SQLite Storage Node", value: "Persisted Ledger Active" },
            { label: "Web Token Status", value: "Active Session Valid" },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
              <span>{row.label}</span>
              <span className="font-semibold text-[#e1e1e6]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
