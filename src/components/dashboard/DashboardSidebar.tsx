
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
  User,
  LogOut,
  Users,
  Car,
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
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="bg-background border-r-zinc-100"
    >
      <SidebarContent className="p-2">
        <SidebarHeader className="mb-4">
           <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            {state === 'expanded' && <span className="text-lg font-light tracking-tighter text-foreground">ASIRI SERVICE</span>}
          </div>
        </SidebarHeader>

        <SidebarMenu className="flex-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                className="font-medium h-10 justify-start rounded-none data-[active=true]:bg-black data-[active=true]:text-white hover:bg-zinc-100"
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
              <Avatar className="h-10 w-10">
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              {state === 'expanded' && (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Admin</span>
                    <span className="text-xs text-zinc-500">admin@asiriservice.io</span>
                </div>
              )}
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 ml-auto rounded-none hover:bg-zinc-100">
            <LogOut className="w-4 h-4"/>
          </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
