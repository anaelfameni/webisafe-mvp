/**
 * Google Analytics 4 Configuration
 * Utilise gtag.js pour le tracking des événements et conversions
 */

/**
 * Initialise Google Analytics 4
 * @param {string} measurementId - Le Measurement ID GA4 (format: G-XXXXXXXXXX)
 */
export function initGA4(measurementId) {
  if (!measurementId) {
    console.warn('⚠️  GA Measurement ID non configuré - Analytics désactivé');
    return;
  }

  // Charger gtag.js de manière asynchrone
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialiser gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    debug_mode: import.meta.env.DEV,
    send_page_view: true,
  });

  console.log('✅ Google Analytics 4 initialisé');
}

/**
 * Track une page view
 * @param {string} pagePath - Le chemin de la page
 * @param {string} pageTitle - Le titre de la page
 */
export function trackPageView(pagePath, pageTitle) {
  if (typeof window.gtag !== 'function') return;
  
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

/**
 * Track un événement personnalisé
 * @param {string} eventName - Le nom de l'événement
 * @param {Object} eventParams - Les paramètres de l'événement
 */
export function trackEvent(eventName, eventParams = {}) {
  if (typeof window.gtag !== 'function') return;
  
  window.gtag('event', eventName, eventParams);
}

/**
 * Événements spécifiques pour Webisafe
 */
export const trackScanInitiated = (url) => {
  trackEvent('scan_initiated', {
    url: url,
  });
};

export const scanCompleted = (score, scanDuration) => {
  trackEvent('scan_completed', {
    score: score,
    scan_duration_ms: scanDuration,
  });
};

export const trackPaymentInitiated = (amount) => {
  trackEvent('payment_initiated', {
    value: amount,
    currency: 'XOF',
  });
};

export const trackPaymentCompleted = (amount, transactionId) => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: amount,
    currency: 'XOF',
  });
};

export const trackSignup = (method = 'email') => {
  trackEvent('sign_up', {
    method: method,
  });
};

export const trackLogin = (method = 'email') => {
  trackEvent('login', {
    method: method,
  });
};

export const trackReportDownload = (format = 'pdf') => {
  trackEvent('report_download', {
    format: format,
  });
};

export const trackContactFormSubmit = (subject) => {
  trackEvent('generate_lead', {
    subject: subject,
  });
};

/**
 * Configure l'utilisateur courant dans GA4
 * @param {string} userId - L'ID de l'utilisateur
 * @param {Object} userProperties - Propriétés additionnelles de l'utilisateur
 */
export function setUser(userId, userProperties = {}) {
  if (typeof window.gtag !== 'function') return;
  
  window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
    user_id: userId,
    ...userProperties,
  });
}

/**
 * Efface l'utilisateur courant
 */
export function clearUser() {
  if (typeof window.gtag !== 'function') return;
  
  window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
    user_id: null,
  });
}
