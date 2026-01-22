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

// Track a page view
const trackPageView = async (pagePath: string) => {
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
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
};

// Function to track lead attribution when a form is submitted
export const trackLeadAttribution = async (leadId: string) => {
  try {
    const utmParams = getStoredUTMParams();
    const referrer = document.referrer || null;
    const landingPage = sessionStorage.getItem("landing_page") || window.location.pathname;

    // Use type assertion for new table not yet in types
    const client = supabase as any;
    await client.from("lead_attribution").insert({
      lead_id: leadId,
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
