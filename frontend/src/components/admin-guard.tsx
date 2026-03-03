'use client';

import React from "react";
import { useAuth } from "@/hooks/use-auth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          Checking permissions…
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold">
            Admin console only
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This web dashboard is intended for administrators. Parents and
            drivers should use the mobile app to access their views.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

