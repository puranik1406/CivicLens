import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Compass,
  Home,
  Plus,
  FileText,
  UserCircle,
  LogOut,
  ChevronRight,
  Bell,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface CitizenLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { key: "home",       label: "Home",         icon: Home,       path: "/citizen/home"       },
  { key: "report",     label: "Report Issue",  icon: Plus,       path: "/citizen/report"     },
  { key: "my-reports", label: "My Reports",    icon: FileText,   path: "/citizen/my-reports" },
  { key: "profile",    label: "Profile",       icon: UserCircle, path: "/citizen/profile"    },
];

const CitizenLayout: React.FC<CitizenLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const activeKey = NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.key ?? "home";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e1e1e6] font-sans antialiased flex">
      {/* ── SIDEBAR ── */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-60"
        } bg-[#0e0e11] border-r border-[#1e1e24] flex flex-col transition-all duration-300 min-h-screen sticky top-0 z-30 flex-shrink-0`}
      >
        {/* Logo row */}
        <div className="h-16 px-3 flex items-center border-b border-[#1e1e24] flex-shrink-0">
          <div className="flex items-center space-x-2.5 flex-1 min-w-0">
            <div className="bg-[#38bdf8] text-[#0a0a0b] p-2 rounded-xl flex-shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-bold text-sm text-[#e1e1e6] leading-tight truncate">
                  CivicLens
                </p>
                <p className="text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider">
                  Citizen Portal
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-1 text-[#52525b] hover:text-[#e1e1e6] transition-colors cursor-pointer flex-shrink-0"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-300 ${
                collapsed ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>

        {/* User badge */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-[#1e1e24]">
            <div className="bg-[#1b253b] border border-[#38bdf8]/25 rounded-xl p-3 flex items-center space-x-2.5">
              <div className="h-8 w-8 bg-[#38bdf8]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[#38bdf8] font-bold text-sm">
                  {(user?.id?.[0] ?? "C").toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#e1e1e6] truncate">{user?.id}</p>
                <p className="text-[10px] text-[#38bdf8] font-semibold">Citizen</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                id={`citizen-nav-${item.key}`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/20"
                    : "text-[#71717a] hover:text-[#e1e1e6] hover:bg-[#18181c]"
                }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto h-1.5 w-1.5 bg-[#38bdf8] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#1e1e24]">
          <button
            id="citizen-logout-btn"
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#71717a] hover:text-[#f87171] hover:bg-[#451212]/50 transition-all cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── PAGE CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[#0e0e11] border-b border-[#1e1e24] flex items-center px-6 sticky top-0 z-20">
          <h2 className="font-bold text-base text-[#e1e1e6]">
            {NAV_ITEMS.find(n => n.key === activeKey)?.label ?? "Citizen Portal"}
          </h2>
          <div className="ml-auto flex items-center space-x-2">
            <button className="p-2 rounded-xl bg-[#18181c] border border-[#26262d] text-[#52525b] hover:text-[#e1e1e6] transition-colors cursor-pointer">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main slot */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CitizenLayout;
