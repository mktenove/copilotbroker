import { ReactNode } from "react";
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
    <div className="min-h-screen bg-[#13132a]">
      {/* Sidebar - fixed left */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        onAddLead={onAddLead}
      />

      {/* Main content - offset by sidebar width */}
      <div className="ml-16 min-h-screen flex flex-col">
        <AdminHeader
          activeTab={activeTab}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          brokers={brokers}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
