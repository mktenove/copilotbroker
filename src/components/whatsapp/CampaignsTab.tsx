import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone, Loader2, FileText } from "lucide-react";
import { useWhatsAppCampaigns } from "@/hooks/use-whatsapp-campaigns";
import { NewCampaignSheet } from "./NewCampaignSheet";
import { CampaignCard } from "./CampaignCard";
import { TemplatesSheet } from "./TemplatesSheet";

export function CampaignsTab() {
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const { 
    campaigns, 
    isLoading, 
    pauseCampaign, 
    resumeCampaign, 
    cancelCampaign 
  } = useWhatsAppCampaigns();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Campanhas</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={() => setIsTemplatesOpen(true)}
            className="bg-[#1a1a1d] border-[#2a2a2e] text-white hover:bg-[#2a2a2e] flex-1 sm:flex-none"
          >
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
            onClick={() => setIsNewCampaignOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <>
          {/* Empty State */}
          <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#2a2a2e] flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-slate-500" />
              </div>
              <CardTitle className="text-white mb-2">Nenhuma campanha ainda</CardTitle>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                Crie sua primeira campanha para disparar mensagens automatizadas para seus leads do Kanban.
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsNewCampaignOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Como funciona
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">
                  1. Escolha os leads por status do Kanban<br />
                  2. Selecione ou crie uma mensagem<br />
                  3. O sistema dispara com intervalo seguro
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Variáveis disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 font-mono">
                  {"{nome}"} - Nome do lead<br />
                  {"{empreendimento}"} - Nome do projeto<br />
                  {"{corretor_nome}"} - Seu nome
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">
                  Intervalo randômico de 1-4 min entre mensagens para proteger seu número de bloqueios.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Campaign List */
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPause={pauseCampaign}
              onResume={resumeCampaign}
              onCancel={cancelCampaign}
            />
          ))}
        </div>
      )}

      <NewCampaignSheet
        open={isNewCampaignOpen}
        onOpenChange={setIsNewCampaignOpen}
      />

      <TemplatesSheet
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
      />
    </div>
  );
}
