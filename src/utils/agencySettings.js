export const AGENCY_SETTINGS_DEFAULTS = {
  agency_name: 'Votre agence',
  logo_url: '',
  primary_color: '#1566F0',
  secondary_color: '#0F172A',
  contact_email: '',
  footer_text: 'Rapport préparé par votre agence avec Webisafe.',
  widget_enabled: true,
  email_capture_enabled: true,
};

const AGENCY_SETTINGS_ENDPOINT = '/api/agency-settings';

function storageKey(user) {
  return `webisafe.agencySettings.${user?.email || 'anonymous'}`;
}

function isValidHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function requestHeaders(options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return headers;
}

function readStoredSettings(user) {
  if (typeof localStorage === 'undefined') return null;

  try {
    const stored = localStorage.getItem(storageKey(user));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeSettings(user, settings) {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(storageKey(user), JSON.stringify(settings));
  } catch {}
}

export function normalizeAgencySettings(input = {}) {
  const primaryColor = isValidHexColor(input.primary_color) ? cleanString(input.primary_color) : AGENCY_SETTINGS_DEFAULTS.primary_color;
  const secondaryColor = isValidHexColor(input.secondary_color) ? cleanString(input.secondary_color) : AGENCY_SETTINGS_DEFAULTS.secondary_color;

  return {
    agency_name: cleanString(input.agency_name) || AGENCY_SETTINGS_DEFAULTS.agency_name,
    logo_url: cleanString(input.logo_url),
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    contact_email: cleanString(input.contact_email),
    footer_text: cleanString(input.footer_text) || AGENCY_SETTINGS_DEFAULTS.footer_text,
    widget_enabled: input.widget_enabled === undefined ? AGENCY_SETTINGS_DEFAULTS.widget_enabled : Boolean(input.widget_enabled),
    email_capture_enabled: input.email_capture_enabled === undefined ? AGENCY_SETTINGS_DEFAULTS.email_capture_enabled : Boolean(input.email_capture_enabled),
  };
}

export async function loadAgencySettings(user, options = {}) {
  try {
    const response = await fetch(AGENCY_SETTINGS_ENDPOINT, {
      headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
    });
    if (response.ok) {
      const data = await response.json();
      const settings = normalizeAgencySettings(data.settings || data);
      storeSettings(user, settings);
      return settings;
    }
  } catch {}

  return normalizeAgencySettings(readStoredSettings(user) || {});
}

export async function saveAgencySettings(user, input, options = {}) {
  const normalized = normalizeAgencySettings(input);

  try {
    const response = await fetch(AGENCY_SETTINGS_ENDPOINT, {
      method: 'POST',
      headers: requestHeaders(options),
      body: JSON.stringify(normalized),
    });

    if (response.ok) {
      const data = await response.json();
      const saved = normalizeAgencySettings(data.settings || data || normalized);
      storeSettings(user, saved);
      return saved;
    }
  } catch {}

  storeSettings(user, normalized);
  return normalized;
}
