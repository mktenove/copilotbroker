import { ReactNode } from "react";
import { BrokerSidebar } from "./BrokerSidebar";
import { BrokerHeader } from "./BrokerHeader";
import { BrokerBottomNav } from "./BrokerBottomNav";

interface BrokerLayoutProps {
  children: ReactNode;
  brokerName?: string;
  brokerInitial?: string;
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onLogout: () => void;
  onCopyLink?: () => void;
  onOpenLanding?: () => void;
  onAddLead?: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function BrokerLayout({
  children,
  brokerName,
  brokerInitial,
  viewMode,
  onViewChange,
  onLogout,
  onCopyLink,
  onOpenLanding,
  onAddLead,
  searchTerm,
  onSearchChange,
}: BrokerLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0f0f12] admin-scrollbar">
      {/* Sidebar - fixed left, hidden on mobile */}
      <BrokerSidebar
        viewMode={viewMode}
        onViewChange={onViewChange}
        onLogout={onLogout}
        onOpenLanding={onOpenLanding}
        onAddLead={onAddLead}
        brokerInitial={brokerInitial}
      />

      {/* Mobile Bottom Navigation */}
      <BrokerBottomNav
        viewMode={viewMode}
        onViewChange={onViewChange}
        onCopyLink={onCopyLink}
        onAddLead={onAddLead}
        onLogout={onLogout}
      />

      {/* Main content - offset by sidebar width on desktop */}
      <div className="md:ml-16 min-h-screen flex flex-col pb-20 md:pb-0">
        <BrokerHeader
          brokerName={brokerName}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
        <main className="flex-1 flex flex-col p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
