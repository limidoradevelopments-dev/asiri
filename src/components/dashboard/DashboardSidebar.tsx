
'use client';

import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Wrench,
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  Users,
  Car,
  FileText,
  BarChart2,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/customers', label: 'Customers', icon: Car },
  { href: '/employees', label: 'Employees', icon: Users },
];

const reportMenuItems = [
    { href: "/reports/profit-loss", label: "Profit & Loss" },
    { href: "/reports/day-end", label: "Day End Report" },
    { href: "/reports/customer", label: "Customer Report" },
]

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  
  const isReportsActive = reportMenuItems.some(item => pathname === item.href);

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="bg-sidebar-background border-r border-sidebar-border transition-all duration-300 ease-in-out"
    >
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border h-[68px] flex items-center">
        <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center w-full')}>
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground whitespace-nowrap">
              ASIRI SERVICE
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 flex-1 ">
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(`
                      h-11 rounded-lg text-sm tracking-tight justify-start
                      data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground
                      hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground
                      text-sidebar-foreground/70`,
                      isCollapsed && 'justify-center'
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          
          {/* Reports Dropdown Menu */}
           <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  isActive={isReportsActive}
                  tooltip="Reports"
                  className={cn(`
                      h-11 rounded-lg text-sm tracking-tight justify-start
                      data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground
                      hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground
                      text-sidebar-foreground/70 `,
                      isCollapsed && "justify-center"
                  )}
                >
                  <BarChart2 className="w-5 h-5 shrink-0" />
                  {!isCollapsed && (
                    <div className="w-full flex justify-between items-center">
                        <span>Reports</span>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side={isCollapsed ? "right" : "bottom"} 
                align={isCollapsed ? "start" : "center"}
                sideOffset={10}
                className="bg-sidebar-background border-sidebar-border text-sidebar-foreground rounded-sm w-48 bg-black"
              >
                {reportMenuItems.map(item => (
                    <DropdownMenuItem key={item.href} asChild>
                        <Link 
                            href={item.href} 
                            className={cn(
                                "cursor-pointer focus:bg-sidebar-accent focus:text-sidebar-accent-foreground",
                                pathname === item.href && "bg-sidebar-accent"
                            )}
                        >
                            {item.label}
                        </Link>
                    </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border space-y-1">
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent',
           isCollapsed && 'justify-center'
        )}>
          <Avatar className="h-9 w-9">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <div className="leading-tight text-sidebar-foreground whitespace-nowrap">
              <span className="text-sm font-medium">Admin</span>
              <span className="block text-xs text-sidebar-foreground/60">
                admin@asiri.io
              </span>
            </div>
          )}
        </div>

        <SidebarMenuButton
          asChild
          className={cn(
            'h-11 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground',
            isCollapsed && 'justify-center'
          )}
        >
          <Link href="#">
             <LogOut className="w-5 h-5" />
             {!isCollapsed && <span>Log Out</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
