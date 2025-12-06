
"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
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
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/customers", label: "Customers", icon: Car },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="bg-sidebar border-r-sidebar-border"
    >
      <SidebarContent className="p-2">
        <SidebarHeader className="mb-4">
           <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            {state === 'expanded' && <span className="text-lg font-light tracking-tighter text-sidebar-foreground">ASIRI SERVICE</span>}
          </div>
        </SidebarHeader>

        <SidebarMenu className="flex-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                className="h-10 justify-start rounded-none font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_2px_0_0_hsl(var(--sidebar-primary))]"
              >
                <Link href={item.href}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2">
          <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-sidebar-border">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">A</AvatarFallback>
              </Avatar>
              {state === 'expanded' && (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-sidebar-foreground">Admin</span>
                    <span className="text-xs text-sidebar-foreground/70">admin@asiriservice.io</span>
                </div>
              )}
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 ml-auto rounded-none text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="w-4 h-4"/>
          </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
