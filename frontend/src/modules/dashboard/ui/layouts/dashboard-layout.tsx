
import { AuthGuard } from "@/components/auth-guard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { DashboardSidebar } from "../components/dashboard-sidebar";

export const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
    
  return (
    
      <AuthGuard>
            <SidebarProvider defaultOpen={defaultOpen}>
                <DashboardSidebar/>
                <main className="flex flex-1 flex-col">
                {children}
                </main>
            </SidebarProvider>
      </AuthGuard>

  );
};