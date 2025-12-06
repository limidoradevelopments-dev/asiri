
"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Wrench,
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  Users,
  Car,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";

export const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Car },
  { href: "/employees", label: "Employees", icon: Users },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="bg-sidebar border-r border-sidebar-border"
    >
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          {state === "expanded" && (
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              ASIRI SERVICE
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={`
                      h-11 rounded-lg text-sm tracking-tight
                      data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground
                      hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground
                      text-sidebar-foreground/70
                  `}
                >
                  <Link href={item.href}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent">
          <Avatar className="h-9 w-9">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>

          {state === "expanded" && (
            <div className="leading-tight text-sidebar-foreground">
              <span className="text-sm font-medium">Admin</span>
              <span className="block text-xs text-sidebar-foreground/60">
                admin@asiri.io
              </span>
            </div>
          )}
        </div>

        <SidebarMenuButton
          asChild
          className="h-11 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
        >
          <Link href="#">
             <LogOut className="w-5 h-5" />
             <span>Log Out</span>
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
