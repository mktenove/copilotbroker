import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowLeft, Copy, ExternalLink, Calculator, Mail, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { STRIPE_PLANS, EXTRA_USER_PRICE } from "@/lib/stripe-plans";

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type CreationType = "self_serve" | "manual" | "migrate";
type InitialStatus = "trialing" | "active" | "pending_payment";

const SuperAdminRealEstateNew = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [generatingCheckout, setGeneratingCheckout] = useState(false);

  // Section A
  const [tenantName, setTenantName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [tag, setTag] = useState("");

  // Section B
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Section C
  const [creationType, setCreationType] = useState<CreationType>("manual");

  // Section D
  const [desiredUsers, setDesiredUsers] = useState(3);
  const extraUsers = Math.max(0, desiredUsers - 3);
  const totalPrice = STRIPE_PLANS.imobiliaria.price + extraUsers * EXTRA_USER_PRICE.price;

  // Section E
  const [initialStatus, setInitialStatus] = useState<InitialStatus>("active");
  const [trialDays, setTrialDays] = useState(14);

  // Section F - Manual
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState("");

  // Section F - Migrate
  const [existingTenantId, setExistingTenantId] = useState("");

  // Section G
  const [sendInvite, setSendInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(
    "Olá! Sua imobiliária foi cadastrada na plataforma Copilot Broker. Acesse o link abaixo para configurar sua conta."
  );
  const [adminNotes, setAdminNotes] = useState("");

  const handleGenerateCheckout = async () => {
    if (!ownerEmail.trim() || !tenantName.trim()) {
      toast.error("Nome da imobiliária e email do owner são obrigatórios");
      return;
    }
    setGeneratingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-checkout", {
        body: {
          owner_email: ownerEmail.trim().toLowerCase(),
          owner_name: ownerName.trim(),
          extra_users: extraUsers,
          tenant_name: tenantName.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCheckoutUrl(data.url);
      if (data.customer_id) setStripeCustomerId(data.customer_id);
      toast.success("Checkout link gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar checkout link");
    } finally {
      setGeneratingCheckout(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !ownerEmail.trim() || !ownerName.trim()) {
      toast.error("Nome, nome do owner e email do owner são obrigatórios");
      return;
    }

    if (creationType === "self_serve" && !checkoutUrl) {
      toast.error("Gere o checkout link antes de salvar");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(tenantName);
      const emailLower = ownerEmail.trim().toLowerCase();

      // Check slug uniqueness
      const { data: existing } = await (supabase.from("tenants" as any).select("id").eq("slug", slug).maybeSingle() as any);
      if (existing && creationType !== "migrate") {
        toast.error("Já existe uma imobiliária com esse nome/slug");
        setIsSubmitting(false);
        return;
      }

      // Check owner email uniqueness (not already owner of another tenant)
      const { data: existingOwner } = await (supabase.from("tenants" as any).select("id, name").eq("owner_email", emailLower).maybeSingle() as any);
      if (existingOwner && creationType !== "migrate") {
        toast.error(`Este email já é owner da imobiliária "${existingOwner.name}"`);
        setIsSubmitting(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada"); setIsSubmitting(false); return; }

      let tenantId: string;

      if (creationType === "migrate") {
        // Migrate existing tenant
        if (!existingTenantId.trim()) {
          toast.error("Informe o Tenant ID existente para migração");
          setIsSubmitting(false);
          return;
        }
        tenantId = existingTenantId.trim();
        const { error: updateErr } = await (supabase.from("tenants" as any).update({
          owner_email: emailLower,
          owner_name: ownerName.trim(),
          owner_phone: ownerPhone.trim() || null,
          plan_type: "real_estate",
          included_users: 3,
          extra_users: extraUsers,
          cnpj: cnpj.trim() || null,
          phone: tenantPhone.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          tag: tag.trim() || null,
          admin_notes: adminNotes.trim() || null,
        }).eq("id", tenantId) as any);
        if (updateErr) throw updateErr;
      } else {
        // Create new tenant
        const statusMap: Record<string, string> = {
          trialing: "trialing",
          active: "active",
          pending_payment: "active", // will be handled by webhook
        };
        const finalStatus = creationType === "self_serve" ? "active" : statusMap[initialStatus];

        const { data: tenant, error } = await (supabase.from("tenants" as any).insert({
          name: tenantName.trim(),
          slug,
          plan_type: "real_estate",
          owner_email: emailLower,
          owner_name: ownerName.trim(),
          owner_phone: ownerPhone.trim() || null,
          status: finalStatus,
          included_users: 3,
          extra_users: extraUsers,
          cnpj: cnpj.trim() || null,
          phone: tenantPhone.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          tag: tag.trim() || null,
          admin_notes: adminNotes.trim() || null,
          trial_ends_at: initialStatus === "trialing" ? new Date(Date.now() + trialDays * 86400000).toISOString() : null,
          stripe_customer_id: stripeCustomerId || null,
          stripe_subscription_id: stripeSubscriptionId || null,
        }).select("id").single() as any);
        if (error) throw error;
        tenantId = tenant.id;
      }

      // Create/update entitlements
      const maxUsers = 3 + extraUsers;
      await (supabase.from("tenant_entitlements" as any).upsert({
        tenant_id: tenantId,
        max_users: maxUsers,
        features: { copilot: true, roletas: true, whatsapp: true, campaigns: true },
      }, { onConflict: "tenant_id" }) as any);

      // Link existing broker if found
      const { data: existingBroker } = await (supabase.from("brokers" as any).select("id, user_id").eq("email", emailLower).maybeSingle() as any);
      if (existingBroker) {
        await (supabase.from("brokers" as any).update({ tenant_id: tenantId }).eq("id", existingBroker.id) as any);
        await (supabase.from("tenant_memberships" as any).upsert({
          tenant_id: tenantId,
          user_id: existingBroker.user_id,
          role: "owner",
          is_active: true,
        }, { onConflict: "tenant_id,user_id" }) as any);
      }

      // Invite
      if (sendInvite) {
        await (supabase.from("invites" as any).insert({
          email: emailLower,
          tenant_id: tenantId,
          invited_by: session.user.id,
          message: inviteMessage,
          status: "sent",
        }) as any);
      }

      // Audit
      await (supabase.from("audit_logs" as any).insert({
        admin_user_id: session.user.id,
        action: creationType === "migrate" ? "tenant_migrated" : "tenant_created",
        target_tenant_id: tenantId,
        after_data: {
          name: tenantName,
          plan_type: "real_estate",
          creation_type: creationType,
          initial_status: initialStatus,
          extra_users: extraUsers,
          max_users: 3 + extraUsers,
        },
      }) as any);

      toast.success(`Imobiliária "${tenantName}" ${creationType === "migrate" ? "migrada" : "criada"} com sucesso!`);
      navigate("/super-admin/tenants/real-estate");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar imobiliária");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const inputClasses = "bg-[#0f0f12] border-[#2a2a2e] text-white placeholder:text-slate-500";
  const labelClasses = "text-slate-300 text-sm";

  return (
    <>
      <Helmet><title>Nova Imobiliária | Super Admin</title></Helmet>
      <div className="text-white p-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Section A — Dados da imobiliária */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">A — Dados da Imobiliária</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={labelClasses}>Nome *</Label>
                    <Input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Ex: Imobiliária Premium" className={inputClasses} required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClasses}>CNPJ</Label>
                    <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className={inputClasses} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={labelClasses}>Telefone</Label>
                    <Input value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} placeholder="(11) 99999-9999" className={inputClasses} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClasses}>Cidade</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="São Paulo" className={inputClasses} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClasses}>UF</Label>
                    <Input value={state} onChange={e => setState(e.target.value)} placeholder="SP" maxLength={2} className={inputClasses} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={labelClasses}>Tag / Origem / Campanha</Label>
                  <Input value={tag} onChange={e => setTag(e.target.value)} placeholder="Ex: indicacao, google-ads, evento-2024" className={inputClasses} />
                </div>
              </CardContent>
            </Card>

            {/* Section B — Owner */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">B — Owner / Admin Inicial</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={labelClasses}>Nome do Owner *</Label>
                    <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="João Silva" className={inputClasses} required />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClasses}>Email do Owner *</Label>
                    <Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="admin@imobiliaria.com" className={inputClasses} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={labelClasses}>Telefone do Owner</Label>
                  <Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="(11) 99999-9999" className={`${inputClasses} max-w-xs`} />
                </div>
              </CardContent>
            </Card>

            {/* Section C — Tipo de criação */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">C — Tipo de Criação</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={creationType} onValueChange={v => { setCreationType(v as CreationType); setCheckoutUrl(""); }} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="self_serve" id="ct_self" className="mt-1 border-slate-500" />
                    <label htmlFor="ct_self" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Self-serve via Stripe Checkout</p>
                      <p className="text-xs text-slate-400">Gera link de checkout para o cliente pagar</p>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="manual" id="ct_manual" className="mt-1 border-slate-500" />
                    <label htmlFor="ct_manual" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Provisionamento manual</p>
                      <p className="text-xs text-slate-400">Cortesia, teste ou setup direto pelo admin</p>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="migrate" id="ct_migrate" className="mt-1 border-slate-500" />
                    <label htmlFor="ct_migrate" className="cursor-pointer">
                      <p className="text-sm font-medium text-white">Migrar tenant existente</p>
                      <p className="text-xs text-slate-400">Vincular owner a um tenant que já existe no banco</p>
                    </label>
                  </div>
                </RadioGroup>

                {creationType === "migrate" && (
                  <div className="mt-4 space-y-2">
                    <Label className={labelClasses}>Tenant ID existente *</Label>
                    <Input value={existingTenantId} onChange={e => setExistingTenantId(e.target.value)} placeholder="uuid do tenant existente" className={inputClasses} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section D — Plano e assentos */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" /> D — Plano e Assentos
              </CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#FFFF00]/10 text-[#FFFF00] border-[#FFFF00]/20">Plano Imobiliária</Badge>
                  <span className="text-sm text-slate-400">R$ {STRIPE_PLANS.imobiliaria.price.toFixed(2)}/mês (3 usuários inclusos)</span>
                </div>
                <Separator className="bg-[#2a2a2e]" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className={labelClasses}>Usuários desejados</Label>
                    <Input type="number" min={3} max={100} value={desiredUsers} onChange={e => setDesiredUsers(Math.max(3, parseInt(e.target.value) || 3))} className={`${inputClasses} w-28`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Inclusos: <span className="text-white font-medium">3</span></p>
                    <p className="text-xs text-slate-400">Adicionais: <span className="text-white font-medium">{extraUsers}</span> × R$ {EXTRA_USER_PRICE.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#0f0f12] border border-[#2a2a2e] rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400">Total mensal</p>
                    <p className="text-xl font-bold text-[#FFFF00]">R$ {totalPrice.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500">{desiredUsers} usuários (max_users = {3 + extraUsers})</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section E — Status inicial */}
            {creationType !== "self_serve" && (
              <Card className="bg-[#1e1e22] border-[#2a2a2e]">
                <CardHeader><CardTitle className="text-white text-base">E — Status Inicial</CardTitle></CardHeader>
                <CardContent>
                  <RadioGroup value={initialStatus} onValueChange={v => setInitialStatus(v as InitialStatus)} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="active" id="st_active" className="mt-1 border-slate-500" />
                      <label htmlFor="st_active" className="cursor-pointer">
                        <p className="text-sm font-medium text-white">Ativo imediato (cortesia)</p>
                        <p className="text-xs text-slate-400">Acesso completo liberado sem pagamento</p>
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="trialing" id="st_trial" className="mt-1 border-slate-500" />
                      <label htmlFor="st_trial" className="cursor-pointer">
                        <p className="text-sm font-medium text-white">Trial</p>
                        <p className="text-xs text-slate-400">Acesso temporário por X dias</p>
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="pending_payment" id="st_pending" className="mt-1 border-slate-500" />
                      <label htmlFor="st_pending" className="cursor-pointer">
                        <p className="text-sm font-medium text-white">Aguardando pagamento</p>
                        <p className="text-xs text-slate-400">Ativa apenas após confirmação de pagamento</p>
                      </label>
                    </div>
                  </RadioGroup>
                  {initialStatus === "trialing" && (
                    <div className="mt-3 space-y-2">
                      <Label className={labelClasses}>Dias de trial</Label>
                      <Input type="number" min={1} max={90} value={trialDays} onChange={e => setTrialDays(parseInt(e.target.value) || 14)} className={`${inputClasses} w-28`} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Section F — Stripe */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base">F — Stripe</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {creationType === "self_serve" ? (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={handleGenerateCheckout}
                        disabled={generatingCheckout || !tenantName.trim() || !ownerEmail.trim()}
                        className="bg-[#FFFF00] text-black hover:bg-[#e6e600]"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {generatingCheckout ? "Gerando..." : "Gerar Checkout Link"}
                      </Button>
                    </div>
                    {checkoutUrl && (
                      <div className="bg-[#0f0f12] border border-[#2a2a2e] rounded-lg p-4 space-y-3">
                        <p className="text-xs text-slate-400">Link de checkout gerado:</p>
                        <div className="flex items-center gap-2">
                          <Input value={checkoutUrl} readOnly className={`${inputClasses} text-xs flex-1`} />
                          <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(checkoutUrl)} className="border-[#2a2a2e] text-slate-300 hover:text-white shrink-0">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => window.open(checkoutUrl, "_blank")} className="border-[#2a2a2e] text-slate-300 hover:text-white shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        {stripeCustomerId && (
                          <p className="text-xs text-slate-500">Customer: {stripeCustomerId}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : creationType === "manual" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={labelClasses}>Stripe Customer ID (opcional)</Label>
                      <Input value={stripeCustomerId} onChange={e => setStripeCustomerId(e.target.value)} placeholder="cus_..." className={inputClasses} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClasses}>Stripe Subscription ID (opcional)</Label>
                      <Input value={stripeSubscriptionId} onChange={e => setStripeSubscriptionId(e.target.value)} placeholder="sub_..." className={inputClasses} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Na migração, os dados de Stripe existentes do tenant serão mantidos.</p>
                )}
              </CardContent>
            </Card>

            {/* Section G — Convite */}
            <Card className="bg-[#1e1e22] border-[#2a2a2e]">
              <CardHeader><CardTitle className="text-white text-base flex items-center gap-2">
                <Mail className="w-4 h-4" /> G — Convite / Onboarding
              </CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={sendInvite} onCheckedChange={v => setSendInvite(!!v)} id="send_invite" />
                  <label htmlFor="send_invite" className="text-sm text-white cursor-pointer">Enviar convite ao owner</label>
                </div>
                {sendInvite && (
                  <Textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} className={`${inputClasses} min-h-[80px]`} />
                )}
                <Separator className="bg-[#2a2a2e]" />
                <div className="space-y-2">
                  <Label className={labelClasses}>Notas internas (somente super admin)</Label>
                  <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Observações..." className={`${inputClasses} h-20 resize-none`} />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#FFFF00] text-black hover:bg-[#e6e600] h-12 text-base font-semibold"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Processando..." : creationType === "migrate" ? "Migrar Tenant" : "Criar Imobiliária"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default SuperAdminRealEstateNew;
