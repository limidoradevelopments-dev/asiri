
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { Inter } from "next/font/google";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { FirebaseClientProvider } from "@/firebase/client-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asiri Service Dashboard",
  description: "Dashboard for your vehicle service station.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <FirebaseClientProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <DashboardSidebar />
              <SidebarInset className="flex flex-1 flex-col bg-background">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto p-2 sm:p-4">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
