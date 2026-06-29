import React from "react";
import { User as UserIcon, Shield, ShieldAlert } from "lucide-react";
import { Role } from "../../context/AuthContext";

interface RoleSelectorProps {
  selectedRole: Role;
  onChange: (role: Role) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full">
      {/* Citizen Card */}
      <button
        type="button"
        onClick={() => onChange("citizen")}
        className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${
          selectedRole === "citizen"
            ? "bg-[#1b253b] border-[#38bdf8] text-[#38bdf8] shadow-md shadow-[#38bdf8]/10 scale-102"
            : "bg-[#141417] border-[#26262d] text-[#94949e] hover:border-[#26262d]/80 hover:bg-[#1a1a1e]"
        }`}
      >
        <div
          className={`p-2 rounded-lg border transition-colors ${
            selectedRole === "citizen"
              ? "bg-[#38bdf8]/10 border-[#38bdf8]/20 text-[#38bdf8]"
              : "bg-[#18181c] border-[#26262d] text-[#94949e]"
          }`}
        >
          <UserIcon className="h-5 w-5" />
        </div>
        <span className="font-semibold text-xs">Citizen</span>
      </button>

      {/* Municipality Officer Card */}
      <button
        type="button"
        onClick={() => onChange("officer")}
        className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${
          selectedRole === "officer"
            ? "bg-[#2c221a] border-[#fbbf24] text-[#fbbf24] shadow-md shadow-[#fbbf24]/10 scale-102"
            : "bg-[#141417] border-[#26262d] text-[#94949e] hover:border-[#26262d]/80 hover:bg-[#1a1a1e]"
        }`}
      >
        <div
          className={`p-2 rounded-lg border transition-colors ${
            selectedRole === "officer"
              ? "bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24]"
              : "bg-[#18181c] border-[#26262d] text-[#94949e]"
          }`}
        >
          <ShieldAlert className="h-5 w-5" />
        </div>
        <span className="font-semibold text-xs text-center leading-tight">Officer</span>
      </button>


      {/* Super Admin Card */}
      <button
        type="button"
        onClick={() => onChange("superadmin")}
        className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${
          selectedRole === "superadmin"
            ? "bg-[#10202f] border-[#38bdf8] text-[#38bdf8] shadow-md shadow-[#38bdf8]/10 scale-102"
            : "bg-[#141417] border-[#26262d] text-[#94949e] hover:border-[#26262d]/80 hover:bg-[#1a1a1e]"
        }`}
      >
        <div
          className={`p-2 rounded-lg border transition-colors ${
            selectedRole === "superadmin"
              ? "bg-[#38bdf8]/10 border-[#38bdf8]/20 text-[#38bdf8]"
              : "bg-[#18181c] border-[#26262d] text-[#94949e]"
          }`}
        >
          <Shield className="h-5 w-5" />
        </div>
        <span className="font-semibold text-xs">Super Admin</span>
      </button>
    </div>
  );
};
