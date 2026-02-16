import { useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalFilters } from "./filters/GlobalFilters";
import { useIntelligenceData, getDefaultFilters, type IntelligenceFilters } from "./hooks/useIntelligenceData";
import { OverviewTab } from "./tabs/OverviewTab";
import { CorretoresTab } from "./tabs/CorretoresTab";
import { RoletasTab } from "./tabs/RoletasTab";
import { FunilTab } from "./tabs/FunilTab";
import { LandingPagesTab } from "./tabs/LandingPagesTab";
import { SLATab } from "./tabs/SLATab";
import { PerdasTab } from "./tabs/PerdasTab";

export default function IntelligenceDashboard() {
  const [filters, setFilters] = useState<IntelligenceFilters>(getDefaultFilters());
  const data = useIntelligenceData(filters);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFFF00]/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-[#FFFF00]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Inteligência Comercial</h1>
          <p className="text-xs text-slate-400">Dashboard estratégico de performance</p>
        </div>
        {data.isLoading && <RefreshCw className="w-4 h-4 animate-spin text-[#FFFF00] ml-2" />}
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filters}
        onChange={setFilters}
        projects={data.projects}
        roletas={data.roletas}
        brokers={data.brokers}
        leads={data.leads}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#141417] border border-[#2a2a2e] w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">Overview</TabsTrigger>
          <TabsTrigger value="corretores" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">Corretores</TabsTrigger>
          <TabsTrigger value="roletas" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">Roletas</TabsTrigger>
          <TabsTrigger value="funil" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">Funil</TabsTrigger>
          <TabsTrigger value="landing" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">Landing Pages</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">SLA</TabsTrigger>
          <TabsTrigger value="perdas" className="text-xs data-[state=active]:bg-[#FFFF00]/10 data-[state=active]:text-[#FFFF00]">Perdas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={data.overview} />
        </TabsContent>
        <TabsContent value="corretores">
          <CorretoresTab data={data.brokerPerformance} />
        </TabsContent>
        <TabsContent value="roletas">
          <RoletasTab data={data.roletaAnalysis} />
        </TabsContent>
        <TabsContent value="funil">
          <FunilTab data={data.funnel} />
        </TabsContent>
        <TabsContent value="landing">
          <LandingPagesTab data={data.originPerformance} />
        </TabsContent>
        <TabsContent value="sla">
          <SLATab distribution={data.slaDistribution} heatmap={data.heatmap} brokerPerformance={data.brokerPerformance} />
        </TabsContent>
        <TabsContent value="perdas">
          <PerdasTab data={data.lossAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
