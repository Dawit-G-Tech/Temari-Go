
import { AuthGuard } from "@/components/auth-guard";
import { AdminGuard } from "@/components/admin-guard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { DashboardSidebar } from "../components/dashboard-sidebar";

export const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
    
  return (
    
      <AuthGuard requireAuth redirectTo="/home">
        <AdminGuard>
          <SidebarProvider defaultOpen={defaultOpen}>
            <DashboardSidebar/>
            <main className="flex flex-1 flex-col">
              {children}
            </main>
          </SidebarProvider>
        </AdminGuard>
      </AuthGuard>

  );
};