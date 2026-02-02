"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  GraduationCap,
  School,
  Bus,
  UserCircle2,
  Route,
  ClipboardCheck,
  MapPin,
  CreditCard,
  BadgeCheck,
  Bell,
  Plug,
  Puzzle,
  MoreVertical,
  User,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

// Overview: core entities (distinct)
const overviewItems = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Students", url: "/student", icon: GraduationCap },
  { title: "Schools", url: "/schools", icon: School },
];

// Fleet: bus, drivers, routes, attendance — Operations lives under these (e.g. Driver page: alcohol tests, feedback, ratings)
const fleetItems = [
  { title: "Bus", url: "/bus", icon: Bus },
  { title: "Drivers", url: "/driver", icon: UserCircle2 },
  { title: "Routes", url: "/routes", icon: Route },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
];

// Map & zones: locations + geofences as one concept (one page with tabs/sections)
const mapItems = [
  { title: "Map & Geofences", url: "/map", icon: MapPin },
];

// Hardware: RFID lives here; assign/manage cards (distinct from Students)
const hardwareItems = [
  { title: "RFID Cards", url: "/rfid-cards", icon: BadgeCheck },
];

// Billing: payments + plans as one section (one page with tabs)
const billingItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
];


const settingsItems = [
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Plugins", url: "/plugins/vapi", icon: Puzzle },
];

const sidebarGroups: { label: string; items: typeof overviewItems }[] = [
  { label: "Overview", items: overviewItems },
  { label: "Fleet & Operations", items: fleetItems },
  { label: "Map & Geofences", items: mapItems },
  { label: "Hardware", items: hardwareItems },
  { label: "Billing", items: billingItems },
  { label: "Settings", items: settingsItems },
]; 

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(url);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/sign-in");
  };

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={cn(
                        isActive(item.url) &&
                          "bg-gradient-to-b from-sidebar-primary to-[#0b63f3]! text-sidebar-primary-foreground! hover:to-[#0b63f3]/90!"
                      )}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 px-2 h-auto py-2 rounded-md",
                "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
              )}
            >
              <Avatar className="size-8 shrink-0 rounded-md">
                <AvatarImage src={undefined} alt={user?.name} />
                <AvatarFallback className="rounded-md bg-muted text-xs font-medium">
                  {user ? getInitials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 min-w-0 flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate w-full">
                  {user?.name ?? "Account"}
                </p>
                <p className="text-xs text-muted-foreground truncate w-full">
                  {user?.email ?? ""}
                </p>
              </div>
              <MoreVertical className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={undefined} alt={user?.name} />
                  <AvatarFallback className="text-sm">
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.name ?? "Account"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email ?? ""}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2">
                <User className="size-4" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="flex items-center gap-2">
                <Bell className="size-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};