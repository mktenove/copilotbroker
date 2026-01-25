import { Kanban, Users, UserCog, Building2, BarChart3, LogOut, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import logoEnove from "@/assets/logo-enove.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const mainNavItems = [
  { id: "crm", label: "CRM", icon: Kanban },
  { id: "leads", label: "Leads", icon: Users },
  { id: "brokers", label: "Corretores", icon: UserCog },
  { id: "projects", label: "Empreendimentos", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminSidebar({ activeTab, onTabChange, onLogout }: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      collapsible="icon"
      className="border-r-0"
      style={{ 
        "--sidebar-background": "232 30% 12%",
        "--sidebar-foreground": "210 20% 85%",
        "--sidebar-border": "232 25% 18%",
        "--sidebar-accent": "232 25% 18%",
        "--sidebar-accent-foreground": "48 96% 53%",
      } as React.CSSProperties}
    >
      {/* Header with Logo */}
      <SidebarHeader className="p-4 border-b border-[hsl(232,25%,18%)]">
        <div className="flex items-center gap-3">
          <img 
            src={logoEnove} 
            alt="Enove" 
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "h-8 w-8 object-contain" : "h-10"
            )} 
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-bold text-white text-sm">Enove</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Imobiliária</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      tooltip={item.label}
                      className={cn(
                        "relative h-11 px-3 rounded-lg transition-all duration-200",
                        "hover:bg-[hsl(232,25%,20%)]",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                      )}
                      <item.icon className={cn(
                        "w-5 h-5 shrink-0",
                        isActive ? "text-primary" : "text-slate-400"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-primary" : "text-slate-300"
                      )}>
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-2 border-t border-[hsl(232,25%,18%)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Sair"
              className="h-11 px-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
