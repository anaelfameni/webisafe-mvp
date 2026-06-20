// Accès statiques uniquement — import.meta.env[dynamicKey] force Vite
// à embarquer TOUTES les VITE_* dans le bundle public (fuite de secrets).
const CLIENT_ENV = {
  VITE_SUPABASE_URL:       import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY:  import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_SENTRY_DSN:         import.meta.env.VITE_SENTRY_DSN,
  VITE_GA_MEASUREMENT_ID:  import.meta.env.VITE_GA_MEASUREMENT_ID,
  VITE_CLARITY_PROJECT_ID: import.meta.env.VITE_CLARITY_PROJECT_ID,
  VITE_ENABLE_TEST_BYPASS: import.meta.env.VITE_ENABLE_TEST_BYPASS,
};

const REQUIRED_VARS = {
  VITE_SUPABASE_URL: 'URL Supabase',
  VITE_SUPABASE_ANON_KEY: 'Clé Anon Supabase',
};

const OPTIONAL_VARS = [
  'VITE_SENTRY_DSN',
  'VITE_GA_MEASUREMENT_ID',
  'VITE_CLARITY_PROJECT_ID',
];

export function validateEnv() {
  const missing = [];

  Object.entries(REQUIRED_VARS).forEach(([key, description]) => {
    if (!CLIENT_ENV[key]) {
      missing.push(key + ' (' + description + ')');
    }
  });

  OPTIONAL_VARS.forEach(key => {
    if (!CLIENT_ENV[key]) {
      console.warn('[webisafe] env optionnel manquant: ' + key);
    }
  });

  if (missing.length > 0) {
    const msg = 'Variables obligatoires manquantes: ' + missing.join(', ');
    console.error(msg);
    if (import.meta.env.PROD) {
      throw new Error(msg);
    }
  } else {
    console.log('[webisafe] Variables env OK');
  }
}

export function getEnvVar(key, defaultValue) {
  if (defaultValue === undefined) defaultValue = '';
  return CLIENT_ENV[key] || defaultValue;
}

export function isDev() {
  return import.meta.env.DEV;
}

export function isProd() {
  return import.meta.env.PROD;
}
