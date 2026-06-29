import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Compass, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
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

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerCitizen, registerOfficer, registerSuperAdmin } = useAuth();

  const [role, setRole] = useState<Role>("citizen");
  const [email, setEmail] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [district, setDistrict] = useState("Hyderabad");
  const [department, setDepartment] = useState("Roads Department");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) { setError("Password is required."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    if (role === "citizen" && !email.trim()) {
      setError("Email is required.");
      return;
    }

    if (role !== "citizen" && !officerId.trim()) {
      setError(role === "superadmin" ? "Super Admin ID is required." : "Officer ID is required.");
      return;
    }

    if (role === "officer" && (!district || !department)) {
      setError("Officer district and department are required.");
      return;
    }

    setLoading(true);
    try {
      let ok = false;
      if (role === "citizen") {
        ok = await registerCitizen(email.trim(), password);
        if (!ok) setError("A citizen account with this email already exists.");
      } else if (role === "officer") {
        ok = await registerOfficer(officerId.trim(), password, district, department);
        if (!ok) setError("An officer account with this ID already exists.");
      } else if (role === "superadmin") {
        ok = await registerSuperAdmin(officerId.trim(), password);
        if (!ok) setError("A Super Admin account with this ID already exists.");
      }

      if (ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 1800);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#34d399]/4 rounded-full blur-3xl" />
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
              <p className="text-xs text-[#94949e] font-medium">{role === "citizen" ? "Citizen Registration" : role === "officer" ? "Officer Registration" : "Super Admin Registration"}</p>
            </div>
          </div>
          <p className="text-sm text-[#71717a]">
            {role === "citizen"
              ? "Create your citizen account to file and track reports"
              : role === "officer"
              ? "Register as a municipality officer to manage local reports"
              : "Register a State command account for superadmin oversight"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111114] border border-[#26262d] rounded-3xl shadow-2xl shadow-black/50 p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#94949e] uppercase tracking-wider">Register as</label>
            <RoleSelector selectedRole={role} onChange={(r) => { setRole(r); setError(null); }} />
          </div>
          <div className="border-t border-[#26262d]" />
          {success ? (
            <div className="text-center space-y-4 py-6">
              <div className="flex justify-center">
                <div className="bg-[#142d1e] border border-[#064e3b] p-4 rounded-2xl">
                  <CheckCircle2 className="h-10 w-10 text-[#34d399]" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#e1e1e6]">Account Created!</h3>
                <p className="text-sm text-[#94949e] mt-1">Redirecting you to login...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#e1e1e6]">
                  Create {role === "citizen" ? "Citizen" : role === "officer" ? "Officer" : "Super Admin"} Account
                </h2>
                <p className="text-xs text-[#94949e] mt-0.5">
                  {role === "citizen"
                    ? "Join the civic reporting network"
                    : role === "officer"
                    ? "Register as a municipality officer"
                    : "Register a State-level command account"}
                </p>
              </div>

              {role === "citizen" ? (
                <div className="space-y-1.5">
                  <label htmlFor="reg-email" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
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
                  <label htmlFor="reg-id" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                    {role === "superadmin" ? "Super Admin ID" : "Officer ID"}
                  </label>
                  <input
                    id="reg-id"
                    type="text"
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value)}
                    placeholder={role === "superadmin" ? "SUPER-001" : "MO-2024-HYD"}
                    className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] placeholder-[#52525b] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 transition-all"
                    required
                  />
                </div>
              )}

              {role === "officer" && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="reg-district" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                      District
                    </label>
                    <select
                      id="reg-district"
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
                    <label htmlFor="reg-department" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                      Department
                    </label>
                    <select
                      id="reg-department"
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

              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] placeholder-[#52525b] rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 transition-all"
                    required
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

              <div className="space-y-1.5">
                <label htmlFor="reg-confirm-password" className="text-xs font-semibold text-[#94949e] uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#141417] border border-[#26262d] text-[#e1e1e6] placeholder-[#52525b] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 transition-all"
                  required
                />
              </div>

              {error && (
                <div className="flex items-start space-x-2 bg-[#451212] border border-[#7f1d1d] rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-[#f87171] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#f87171] font-medium">{error}</p>
                </div>
              )}

              <button
                id="register-submit-btn"
                type="submit"
                disabled={loading}
                className={`w-full bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0a0a0b] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg shadow-[#38bdf8]/20 cursor-pointer ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center text-xs text-[#71717a]">
              Already have an account?{" "}
              <Link to="/login" className="text-[#38bdf8] font-semibold hover:text-[#38bdf8]/80 transition-colors">
                Sign in here
              </Link>
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
