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
    if (!import.meta.env[key]) {
      missing.push(`${key} (${description})`);
    }
  });

  OPTIONAL_VARS.forEach(key => {
    if (!import.meta.env[key]) {
      console.warn(`⚠️ ${key} manquant (optionnel)`);
    }
  });

  if (missing.length > 0) {
    const msg = `❌ Variables obligatoires manquantes:\n${missing.map(m => `  - ${m}`).join('\n')}`;
    console.error(msg);
    // En dev : warning seulement, pas de crash
    if (import.meta.env.PROD) {
      throw new Error(msg);
    }
  } else {
    console.log('✅ Variables d\'environnement OK');
  }
}

export function getEnvVar(key, defaultValue = '') {
  return import.meta.env[key] || defaultValue;
}

export function isDev() {
  return import.meta.env.DEV;
}

export function isProd() {
  return import.meta.env.PROD;
}