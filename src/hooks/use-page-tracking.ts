import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

// Generate a simple session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("page_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("page_session_id", sessionId);
  }
  return sessionId;
};

// Extract UTM parameters from URL
export const getUTMParams = (): UTMParams => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
};

// Store UTM params in session for later use (lead attribution)
export const storeUTMParams = (): void => {
  const utmParams = getUTMParams();
  if (utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign) {
    sessionStorage.setItem("utm_params", JSON.stringify(utmParams));
  }
};

// Get stored UTM params
export const getStoredUTMParams = (): UTMParams => {
  const stored = sessionStorage.getItem("utm_params");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { utm_source: null, utm_medium: null, utm_campaign: null };
    }
  }
  return getUTMParams();
};

// Helper: Capitalize first letter
const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper: Format source name to friendly display
const formatSourceName = (source: string): string => {
  const mapping: Record<string, string> = {
    'fb': 'Facebook',
    'ig': 'Instagram',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'google': 'Google',
    'tiktok': 'TikTok',
    'linkedin': 'LinkedIn',
    'youtube': 'YouTube',
    'twitter': 'Twitter/X',
    'x': 'Twitter/X',
    'bing': 'Bing',
    'meta': 'Meta',
    'email': 'Email',
    'whatsapp': 'WhatsApp',
  };
  return mapping[source.toLowerCase()] || capitalizeFirst(source);
};

// Helper: Extract domain from referrer
const extractDomain = (referrer: string): string | null => {
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
};

// Helper: Format domain name to friendly display
const formatDomainName = (domain: string): string => {
  const mapping: Record<string, string> = {
    'google.com': 'Google',
    'google.com.br': 'Google',
    'facebook.com': 'Facebook',
    'instagram.com': 'Instagram',
    'linkedin.com': 'LinkedIn',
    'tiktok.com': 'TikTok',
    'youtube.com': 'YouTube',
    't.co': 'Twitter/X',
    'l.facebook.com': 'Facebook',
    'lm.facebook.com': 'Facebook',
  };
  return mapping[domain] || domain;
};

// Get lead origin from UTM params - returns descriptive string
export const getLeadOriginFromUTM = (): string | null => {
  const utmParams = getStoredUTMParams();
  const referrer = document.referrer?.toLowerCase() || '';
  
  const source = utmParams.utm_source;
  const medium = utmParams.utm_medium;
  const campaign = utmParams.utm_campaign;
  
  // Se tiver UTM source, criar string descritiva
  if (source) {
    const parts: string[] = [];
    
    // Formatar nome da source
    parts.push(formatSourceName(source));
    
    // Adicionar medium se existir (cpc, organic, etc)
    if (medium) {
      parts.push(`(${medium})`);
    }
    
    // Adicionar campaign se existir
    if (campaign) {
      parts.push(`- ${campaign}`);
    }
    
    return parts.join(' ');
    // Exemplos de saída:
    // "Facebook (cpc) - lancamento_jan25"
    // "Google (organic)"
    // "Instagram (paid_social) - remarketing"
  }
  
  // Se não tiver UTM, tentar detectar pelo referrer
  if (referrer) {
    const domain = extractDomain(referrer);
    if (domain) {
      const formattedDomain = formatDomainName(domain);
      // Não retornar se for o próprio domínio do site
      if (!referrer.includes('lovable.app') && !referrer.includes('onovocondominio')) {
        return `Referral: ${formattedDomain}`;
      }
    }
  }
  
  return null; // Origem não detectável - corretor preenche manualmente
};

// Track a page view
const trackPageView = async (pagePath: string, projectId?: string) => {
  try {
    const utmParams = getUTMParams();
    const sessionId = getSessionId();
    const referrer = document.referrer || null;

    // Store UTM params for later attribution
    storeUTMParams();

    // Use type assertion for new table not yet in types
    const client = supabase as any;
    await client.from("page_views").insert({
      page_path: pagePath,
      project_id: projectId || null,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      referrer: referrer,
      session_id: sessionId,
    });
  } catch (error) {
    // Silent fail - don't interrupt user experience
    console.error("Error tracking page view:", error);
  }
};

// Custom hook to track page views
export const usePageTracking = (projectId?: string) => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, projectId);
  }, [location.pathname, projectId]);
};

// Function to track lead attribution when a form is submitted
export const trackLeadAttribution = async (leadId: string, projectId?: string) => {
  try {
    const utmParams = getStoredUTMParams();
    const referrer = document.referrer || null;
    const landingPage = sessionStorage.getItem("landing_page") || window.location.pathname;

    // Use type assertion for new table not yet in types
    const client = supabase as any;
    await client.from("lead_attribution").insert({
      lead_id: leadId,
      project_id: projectId || null,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      landing_page: landingPage,
      referrer: referrer,
    });
  } catch (error) {
    console.error("Error tracking lead attribution:", error);
  }
};

export default usePageTracking;
