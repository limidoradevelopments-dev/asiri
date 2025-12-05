
'use client';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <DashboardSidebar />
                <div className="flex flex-1 flex-col">
                    <SidebarInset>
                        {children}
                    </SidebarInset>
                </div>
            </div>
        </SidebarProvider>
    );
}

