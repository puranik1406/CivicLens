import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, Role } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: Role;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    if (user.role === "superadmin") {
      return <>{children}</>;
    }

    // Redirect to the correct dashboard based on actual role
    if (user.role === "citizen") return <Navigate to="/citizen/home" replace />;
    if (user.role === "officer") return <Navigate to="/officer/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
