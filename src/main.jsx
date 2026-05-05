import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { validateEnv } from './lib/envValidation'
import { initSentry } from './lib/sentry'
import { initGA4 } from './lib/analytics'
import './lib/i18n' // Initialisation i18n pour future expansion
import './index.css'

// Validation stricte des variables d'environnement au démarrage
validateEnv()

// Initialisation Sentry pour le tracking d'erreurs
initSentry()

// Initialisation Google Analytics 4 pour le tracking des conversions
initGA4(import.meta.env.VITE_GA_MEASUREMENT_ID)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
