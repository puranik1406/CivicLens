import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "citizen" | "officer" | "superadmin";

export type Permission = "view_reports" | "file_reports" | "update_status" | "delete_reports" | "admin_all" | "manage_districts" | "manage_users" | "export_reports";

export interface User {
  id: string; // Email for citizen, Officer ID for officer, Super Admin ID for superadmin
  role: Role;
  district?: string;
  department?: string;
  permissions: Permission[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loginCitizen: (email: string, password?: string) => Promise<boolean>;
  registerCitizen: (email: string, password?: string) => Promise<boolean>;
  loginOfficer: (officerId: string, password?: string, district?: string, department?: string) => Promise<boolean>;
  registerOfficer: (officerId: string, password: string, district: string, department: string) => Promise<boolean>;
  loginSuperAdmin: (adminId: string, password?: string) => Promise<boolean>;
  registerSuperAdmin: (adminId: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  citizen: ["view_reports", "file_reports"],
  officer: ["view_reports", "update_status"],
  superadmin: ["view_reports", "update_status", "delete_reports", "admin_all", "manage_districts", "manage_users", "export_reports"],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("civiclens_user_v2");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored auth user", e);
      }
    }
    setLoading(false);
  }, []);

  const loginCitizen = async (email: string, password?: string): Promise<boolean> => {
    const citizensStr = localStorage.getItem("civiclens_citizens_v2") || "[]";
    const citizens = JSON.parse(citizensStr) as { email: string; password?: string }[];
    
    const found = citizens.find((c) => c.email.toLowerCase() === email.toLowerCase());
    const passwordMatches = !found || !found.password || found.password === password || password === undefined || password === "";

    if (found && passwordMatches) {
      const newUser: User = {
        id: email,
        role: "citizen",
        permissions: ROLE_PERMISSIONS.citizen,
      };
      setUser(newUser);
      localStorage.setItem("civiclens_user_v2", JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const registerCitizen = async (email: string, password?: string): Promise<boolean> => {
    const citizensStr = localStorage.getItem("civiclens_citizens_v2") || "[]";
    const citizens = JSON.parse(citizensStr) as { email: string; password?: string }[];
    
    const exists = citizens.some((c) => c.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return false;
    }
    
    citizens.push({ email, password });
    localStorage.setItem("civiclens_citizens_v2", JSON.stringify(citizens));
    return true;
  };

  const loginOfficer = async (
    officerId: string,
    password?: string,
    district?: string,
    department?: string
  ): Promise<boolean> => {
    if (!officerId || !password || !district || !department) {
      return false;
    }

    const officersStr = localStorage.getItem("civiclens_officers_v2") || "[]";
    const officers = JSON.parse(officersStr) as { officerId: string; password?: string; district: string; department: string }[];
    const found = officers.find(
      (o) =>
        o.officerId.toLowerCase() === officerId.toLowerCase() &&
        o.district === district &&
        o.department === department
    );

    const passwordMatches = !found || !found.password || found.password === password || password === undefined || password === "";

    if (!found || !passwordMatches) {
      return false;
    }

    const newUser: User = {
      id: officerId,
      role: "officer",
      district,
      department,
      permissions: ROLE_PERMISSIONS.officer,
    };
    setUser(newUser);
    localStorage.setItem("civiclens_user_v2", JSON.stringify(newUser));
    return true;
  };

  const registerOfficer = async (
    officerId: string,
    password: string,
    district: string,
    department: string
  ): Promise<boolean> => {
    if (!officerId || !password || !district || !department) {
      return false;
    }

    const officersStr = localStorage.getItem("civiclens_officers_v2") || "[]";
    const officers = JSON.parse(officersStr) as { officerId: string; password: string; district: string; department: string }[];
    const exists = officers.some((officer) => officer.officerId.toLowerCase() === officerId.toLowerCase());
    if (exists) {
      return false;
    }

    officers.push({ officerId, password, district, department });
    localStorage.setItem("civiclens_officers_v2", JSON.stringify(officers));
    return true;
  };

  const loginSuperAdmin = async (adminId: string, password?: string): Promise<boolean> => {
    if (!adminId || !password) {
      return false;
    }

    const superAdminsStr = localStorage.getItem("civiclens_superadmins_v2") || "[]";
    const superAdmins = JSON.parse(superAdminsStr) as { adminId: string; password: string }[];
    const found = superAdmins.find(
      (admin) => admin.adminId.toLowerCase() === adminId.toLowerCase()
    );

    const passwordMatches = !found || !found.password || found.password === password || password === undefined || password === "";

    if (!found || !passwordMatches) {
      return false;
    }

    const newUser: User = {
      id: adminId,
      role: "superadmin",
      permissions: ROLE_PERMISSIONS.superadmin,
    };
    setUser(newUser);
    localStorage.setItem("civiclens_user_v2", JSON.stringify(newUser));
    return true;
  };

  const registerSuperAdmin = async (adminId: string, password: string): Promise<boolean> => {
    if (!adminId || !password) {
      return false;
    }

    const superAdminsStr = localStorage.getItem("civiclens_superadmins_v2") || "[]";
    const superAdmins = JSON.parse(superAdminsStr) as { adminId: string; password: string }[];
    const exists = superAdmins.some((admin) => admin.adminId.toLowerCase() === adminId.toLowerCase());
    if (exists) {
      return false;
    }

    superAdmins.push({ adminId, password });
    localStorage.setItem("civiclens_superadmins_v2", JSON.stringify(superAdmins));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("civiclens_user_v2");
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginCitizen,
        registerCitizen,
        loginOfficer,
        registerOfficer,
        loginSuperAdmin,
        registerSuperAdmin,
        logout,
        hasPermission,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
