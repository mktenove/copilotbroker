import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

interface ClickParams {
  gclid: string | null;    // Google Ads
  gbraid: string | null;   // Google Ads (iOS)
  wbraid: string | null;   // Google Ads (web-to-app)
  fbclid: string | null;   // Meta Ads (Facebook/Instagram)
  ttclid: string | null;   // TikTok Ads
  li_fat_id: string | null; // LinkedIn Ads
  msclkid: string | null;  // Microsoft/Bing Ads
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
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
};

// Extract click IDs from ad platforms
export const getClickParams = (): ClickParams => {
  const params = new URLSearchParams(window.location.search);
  return {
    gclid: params.get("gclid"),
    gbraid: params.get("gbraid"),
    wbraid: params.get("wbraid"),
    fbclid: params.get("fbclid"),
    ttclid: params.get("ttclid"),
    li_fat_id: params.get("li_fat_id"),
    msclkid: params.get("msclkid"),
  };
};

// Store tracking params in session for later use (lead attribution)
export const storeTrackingParams = (): void => {
  const utmParams = getUTMParams();
  const clickParams = getClickParams();
  
  const hasUTM = utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign;
  const hasClick = clickParams.gclid || clickParams.gbraid || clickParams.wbraid || 
                   clickParams.fbclid || clickParams.ttclid || 
                   clickParams.li_fat_id || clickParams.msclkid;
  
  if (hasUTM) {
    sessionStorage.setItem("utm_params", JSON.stringify(utmParams));
  }
  if (hasClick) {
    sessionStorage.setItem("click_params", JSON.stringify(clickParams));
  }
};

// Legacy function - now calls storeTrackingParams
export const storeUTMParams = (): void => {
  storeTrackingParams();
};

// Get stored UTM params
export const getStoredUTMParams = (): UTMParams => {
  const stored = sessionStorage.getItem("utm_params");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
    }
  }
  return getUTMParams();
};

// Get stored click params
export const getStoredClickParams = (): ClickParams => {
  const stored = sessionStorage.getItem("click_params");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { gclid: null, gbraid: null, wbraid: null, fbclid: null, ttclid: null, li_fat_id: null, msclkid: null };
    }
  }
  return getClickParams();
};

// Helper: Capitalize first letter
const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper: Format source name to friendly display
const formatSourceName = (source: string): string => {
  const mapping: Record<string, string> = {
    // Abreviações comuns
    'fb': 'Facebook',
    'ig': 'Instagram',
    'yt': 'YouTube',
    'tw': 'Twitter/X',
    'li': 'LinkedIn',
    'tt': 'TikTok',
    'pin': 'Pinterest',
    'gads': 'Google Ads',
    'meta': 'Meta',
    // Nomes completos
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'google': 'Google',
    'tiktok': 'TikTok',
    'linkedin': 'LinkedIn',
    'youtube': 'YouTube',
    'twitter': 'Twitter/X',
    'x': 'Twitter/X',
    'bing': 'Bing',
    'email': 'Email',
    'whatsapp': 'WhatsApp',
    'pinterest': 'Pinterest',
    'reddit': 'Reddit',
    'threads': 'Threads',
    'snapchat': 'Snapchat',
    'telegram': 'Telegram',
  };
  return mapping[source.toLowerCase()] || capitalizeFirst(source);
};

// Helper: Format medium to friendly display
const formatMediumName = (medium: string): string => {
  const mapping: Record<string, string> = {
    'cpc': 'CPC',
    'ppc': 'PPC',
    'cpm': 'CPM',
    'paid': 'Pago',
    'paid_social': 'Social Pago',
    'organic': 'Orgânico',
    'social': 'Social',
    'email': 'Email',
    'referral': 'Referral',
    'display': 'Display',
    'banner': 'Banner',
    'video': 'Vídeo',
    'retargeting': 'Retargeting',
    'remarketing': 'Remarketing',
  };
  return mapping[medium.toLowerCase()] || medium;
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
    // Google
    'google.com': 'Google',
    'google.com.br': 'Google',
    'google.pt': 'Google',
    
    // Meta / Facebook
    'facebook.com': 'Facebook',
    'fb.com': 'Facebook',
    'l.facebook.com': 'Facebook',
    'lm.facebook.com': 'Facebook',
    'm.facebook.com': 'Facebook',
    'web.facebook.com': 'Facebook',
    
    // Instagram
    'instagram.com': 'Instagram',
    'l.instagram.com': 'Instagram',
    
    // TikTok
    'tiktok.com': 'TikTok',
    'vm.tiktok.com': 'TikTok',
    'www.tiktok.com': 'TikTok',
    
    // LinkedIn
    'linkedin.com': 'LinkedIn',
    'lnkd.in': 'LinkedIn',
    
    // Twitter/X
    't.co': 'Twitter/X',
    'twitter.com': 'Twitter/X',
    'x.com': 'Twitter/X',
    'mobile.twitter.com': 'Twitter/X',
    
    // YouTube
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'm.youtube.com': 'YouTube',
    
    // Pinterest
    'pinterest.com': 'Pinterest',
    'pinterest.com.br': 'Pinterest',
    'br.pinterest.com': 'Pinterest',
    'pin.it': 'Pinterest',
    
    // Outros sociais
    'reddit.com': 'Reddit',
    'old.reddit.com': 'Reddit',
    'threads.net': 'Threads',
    'whatsapp.com': 'WhatsApp',
    'web.whatsapp.com': 'WhatsApp',
    'api.whatsapp.com': 'WhatsApp',
    'snapchat.com': 'Snapchat',
    'telegram.org': 'Telegram',
    't.me': 'Telegram',
    
    // Buscadores
    'bing.com': 'Bing',
    'duckduckgo.com': 'DuckDuckGo',
    'yahoo.com': 'Yahoo',
    'search.yahoo.com': 'Yahoo',
    'ecosia.org': 'Ecosia',
    'baidu.com': 'Baidu',
    
    // Email providers (quando clicam em links de email)
    'mail.google.com': 'Gmail',
    'outlook.live.com': 'Outlook',
    'outlook.office.com': 'Outlook',
  };
  return mapping[domain] || domain;
};

// Check if domain is our own site (to exclude from referrer tracking)
const isOwnDomain = (referrer: string): boolean => {
  const ownDomains = [
    'lovable.app',
    'onovocondominio',
    'localhost',
    '127.0.0.1',
  ];
  const lower = referrer.toLowerCase();
  return ownDomains.some(domain => lower.includes(domain));
};

// Map UTM source to standardized origin key
const mapSourceToOriginKey = (source: string, medium?: string | null): string => {
  const s = source.toLowerCase();
  
  // Meta / Facebook / Instagram
  if (['metaads', 'facebook', 'instagram', 'fb', 'ig', 'meta'].includes(s)) {
    return 'meta_ads';
  }
  
  // Google
  if (s === 'google' || s === 'gads') {
    const m = (medium || '').toLowerCase();
    if (['cpc', 'paid', 'ppc', 'cpm', 'paid_social', 'display', 'banner'].includes(m)) {
      return 'google_ads';
    }
    if (m === 'organic' || m === 'organico') {
      return 'google_organico';
    }
    return 'google_ads'; // Default google with UTM = ads
  }
  
  // TikTok
  if (['tiktok', 'tt'].includes(s)) return 'tiktok_ads';
  
  // LinkedIn
  if (['linkedin', 'li'].includes(s)) return 'linkedin_ads';
  
  // Bing
  if (s === 'bing') return 'bing_ads';
  
  // Return source as-is for unknown sources
  return source;
};

// Build detail string from UTM medium + campaign
const buildOriginDetail = (utmParams: UTMParams): string | null => {
  const parts: string[] = [];
  if (utmParams.utm_medium) parts.push(utmParams.utm_medium);
  if (utmParams.utm_campaign) parts.push(utmParams.utm_campaign);
  return parts.length > 0 ? parts.join(' - ') : null;
};

// Get lead origin from tracking params - returns standardized key
export const getLeadOriginFromUTM = (): string | null => {
  const utmParams = getStoredUTMParams();
  const clickParams = getStoredClickParams();
  const referrer = document.referrer?.toLowerCase() || '';
  
  // PRIORITY 1: UTM Parameters (most precise - user-defined)
  if (utmParams.utm_source) {
    return mapSourceToOriginKey(utmParams.utm_source, utmParams.utm_medium);
  }
  
  // PRIORITY 2: Click IDs (indicates paid ad click - auto-detected)
  if (clickParams.gclid || clickParams.gbraid || clickParams.wbraid) return 'google_ads';
  if (clickParams.fbclid) return 'meta_ads';
  if (clickParams.ttclid) return 'tiktok_ads';
  if (clickParams.li_fat_id) return 'linkedin_ads';
  if (clickParams.msclkid) return 'bing_ads';
  
  // PRIORITY 3: Referrer detection
  if (referrer && !isOwnDomain(referrer)) {
    const domain = extractDomain(referrer);
    if (domain) {
      const formattedDomain = formatDomainName(domain);
      
      // Detectar se é busca orgânica
      const searchEngines = ['Google', 'Bing', 'DuckDuckGo', 'Yahoo', 'Ecosia', 'Baidu'];
      if (searchEngines.includes(formattedDomain)) {
        return 'google_organico';
      }
      
      // Para redes sociais, indicar como referral
      return `Referral: ${formattedDomain}`;
    }
  }
  
  return null; // Origem não detectável - corretor preenche manualmente
};

// Get lead origin detail from UTM params (campaign/medium info)
export const getLeadOriginDetailFromUTM = (): string | null => {
  const utmParams = getStoredUTMParams();
  if (!utmParams.utm_source) return null;
  return buildOriginDetail(utmParams);
};

// Track a page view
const trackPageView = async (pagePath: string, projectId?: string) => {
  try {
    const utmParams = getUTMParams();
    const sessionId = getSessionId();
    const referrer = document.referrer || null;

    // Store all tracking params for later attribution
    storeTrackingParams();

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
// landingPageType: "landing_page" for public forms, "admin_manual" for manual entry
export const trackLeadAttribution = async (
  leadId: string, 
  projectId?: string,
  landingPageType?: string
) => {
  try {
    const utmParams = getStoredUTMParams();
    const referrer = document.referrer || null;
    // Use provided type, or fallback to stored/current path
    const landingPage = landingPageType || sessionStorage.getItem("landing_page") || window.location.pathname;

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
