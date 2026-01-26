import { ReactNode, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationPanel } from "./NotificationPanel";

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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0f12] admin-scrollbar">
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
        onNotificationsClick={() => setIsNotificationsOpen(true)}
      />

      {/* Mobile Notifications Sheet */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md bg-[#0f0f12] border-[#2a2a2e] p-0">
          <SheetHeader className="p-4 border-b border-[#2a2a2e]">
            <SheetTitle className="text-white">Notificações</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-60px)] overflow-y-auto admin-scrollbar">
            <NotificationPanel />
          </div>
        </SheetContent>
      </Sheet>

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
