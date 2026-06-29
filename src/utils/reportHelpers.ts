// Shared badge utilities for report severity and status

export const getSeverityBadgeClass = (sev: string) => {
  switch (sev) {
    case "Critical": return "bg-[#451212] text-[#f87171] border border-[#7f1d1d]";
    case "High":     return "bg-[#451a1a] text-[#f87171] border border-[#7f1d1d]";
    case "Medium":   return "bg-[#332212] text-[#fbbf24] border border-[#78350f]";
    case "Low":      return "bg-[#112233] text-[#60a5fa] border border-[#1e3a8a]";
    default:         return "bg-[#1a1a1e] text-[#94949e] border border-[#26262d]";
  }
};

export const getSeverityDot = (sev: string) => {
  switch (sev) {
    case "Critical": return "bg-rose-500";
    case "High":     return "bg-amber-500";
    case "Medium":   return "bg-blue-500";
    case "Low":      return "bg-slate-400";
    default:         return "bg-slate-600";
  }
};

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Pending":     return "bg-[#2d2212] text-[#fbbf24] border border-[#78350f]";
    case "In Progress": return "bg-[#122b3d] text-[#38bdf8] border border-[#0369a1]";
    case "Resolved":    return "bg-[#142d1e] text-[#34d399] border border-[#064e3b]";
    default:            return "bg-[#1a1a1e] text-[#94949e] border border-[#26262d]";
  }
};

export const getEstimatedTime = (severity: string): string => {
  switch (severity) {
    case "Critical": return "2–4 hours";
    case "High":     return "24–48 hours";
    case "Medium":   return "3–5 business days";
    case "Low":      return "7–14 business days";
    default:         return "To be determined";
  }
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
