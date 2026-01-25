import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onAddLead?: () => void;
}

export function AdminLayout({
  children,
  activeTab,
  onTabChange,
  onLogout,
  searchTerm,
  onSearchChange,
  onAddLead,
}: AdminLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
        />
        <SidebarInset className="flex-1 flex flex-col">
          <AdminHeader
            activeTab={activeTab}
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            onAddLead={onAddLead}
          />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
