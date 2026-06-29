import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Compass, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useAuth, Role } from "../context/AuthContext";
import { RoleSelector } from "../components/auth/RoleSelector";

const DISTRICTS = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "San Francisco",
];

const DEPARTMENTS = [
  "Roads Department",
  "Water & Sanitation",
  "Electricity Department",
  "Parks & Recreation",
  "Public Works",
  "Health & Safety",
  "Urban Planning",
  "Traffic Management",
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginCitizen, loginOfficer, loginSuperAdmin } = useAuth();

  const [role, setRole] = useState<Role>("citizen");
  const [email, setEmail] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let success = false;

      if (role === "citizen") {
        if (!email.trim()) { setError("Email is required."); return; }
        success = await loginCitizen(email.trim(), password);
        if (!success) setError("No account found. Please register first.");
        else navigate("/citizen/home");
      } else if (role === "officer") {
        if (!officerId.trim()) { setError("Officer ID is required."); return; }
        success = await loginOfficer(officerId.trim(), password, district, department);
        if (!success) setError("Officer ID, district and department are required.");
        else navigate("/officer/dashboard");
      } else if (role === "superadmin") {
        if (!officerId.trim()) { setError("Super Admin ID is required."); return; }
        success = await loginSuperAdmin(officerId.trim(), password);
        if (!success) setError("Super Admin ID is required.");
        else navigate("/superadmin/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#38bdf8]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#a855f7]/4 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-[#38bdf8] text-[#0a0a0b] p-3 rounded-2xl shadow-lg shadow-[#38bdf8]/20">
              <Compass className="h-7 w-7 stroke-[2.2]" />
            </div>
            <div className="text-left">
              <h1 className="font-bold text-2xl text-[#e1e1e6] tracking-tight">CivicLens</h1>
              <p className="text-xs text-[#94949e] font-medium">Government Civic Management Platform</p>
            </div>
          </div>
          <p className="text-sm text-[#71717a]">Select your role and sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-[#111114] border border-[#26262d] rounded-3xl shadow-2xl shadow-black/50 p-8 space-y-6">
          {/* Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#94949e] uppercase tracking-wider">Sign in as</label>
            <RoleSelector selectedRole={role} onChange={(r) => { setRole(r); setError(null); }} />
          </div>

          <div className="border-t border-[#26262d]" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (Citizen) / ID (Officer/Super Admin) */}
            {role === "citizen" ? (
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] placeholder-[#52525b] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 transition-all"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="login-id" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                  {role === "superadmin" ? "Super Admin ID" : "Officer ID"}
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder={role === "superadmin" ? "e.g. SUPER-001" : "e.g. MO-2024-HYD"}
                  className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] placeholder-[#52525b] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 transition-all"
                  required
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] placeholder-[#52525b] rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#94949e] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Officer-specific fields */}
            {role === "officer" && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="login-district" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                    District
                  </label>
                  <select
                    id="login-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24]/30 transition-all cursor-pointer"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d} className="bg-[#141417]">{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-department" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                    Department
                  </label>
                  <select
                    id="login-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24]/30 transition-all cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-[#141417]">{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start space-x-2 bg-[#451212] border border-[#7f1d1d] rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-[#f87171] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#f87171] font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg cursor-pointer ${
                role === "citizen"
                  ? "bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0a0a0b] shadow-[#38bdf8]/20"
                  : role === "officer"
                  ? "bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#0a0a0b] shadow-[#fbbf24]/20"
                  : "bg-[#a855f7] hover:bg-[#a855f7]/90 text-white shadow-[#a855f7]/20"
              } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>
                    {role === "citizen" ? "Sign In as Citizen" : role === "officer" ? "Sign In as Officer" : "Sign In as Super Admin"}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Register Link (Citizens only) */}
          {role === "citizen" && (
            <p className="text-center text-xs text-[#71717a]">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#38bdf8] font-semibold hover:text-[#38bdf8]/80 transition-colors">
                Register here
              </Link>
            </p>
          )}

          {role === "officer" && (
            <p className="text-center text-xs text-[#71717a]">
              Enter any Officer ID with your district & department to access the portal.
            </p>
          )}

          {role === "superadmin" && (
            <p className="text-center text-xs text-[#71717a]">
              Enter any Super Admin ID to access the State Government command center.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-[#3f3f46] mt-6">
          © {new Date().getFullYear()} CivicLens · Government Civic Management Platform
        </p>
      </div>
    </div>
  );
};
