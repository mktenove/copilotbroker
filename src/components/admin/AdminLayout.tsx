import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { MobileBottomNav } from "./MobileBottomNav";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onAddLead?: () => void;
  brokers?: { id: string; name: string; slug: string }[];
}

export function AdminLayout({
  children,
  activeTab,
  onTabChange,
  onLogout,
  searchTerm,
  onSearchChange,
  onAddLead,
  brokers,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0f0f12]">
      {/* Sidebar - fixed left, hidden on mobile */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        onAddLead={onAddLead}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onAddLead={onAddLead}
      />

      {/* Main content - offset by sidebar width on desktop */}
      <div className="md:ml-16 min-h-screen flex flex-col pb-20 md:pb-0">
        <AdminHeader
          activeTab={activeTab}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          brokers={brokers}
        />
        <main className="flex-1 flex flex-col p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
