import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import scanRouter from './routes/scan.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── BODY PARSER ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/scan', scanRouter);

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Webisafe Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable' });
});

// ── GESTION D'ERREURS GLOBALE ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERREUR GLOBALE]', err.message, err.stack);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Webisafe Backend démarré sur http://localhost:${PORT}`);
  console.log(`🔑 PageSpeed KEY : ${process.env.GOOGLE_PAGESPEED_KEY ? '✅ présente' : '❌ MANQUANTE'}`);
  console.log(`🔑 VirusTotal KEY : ${process.env.VIRUSTOTAL_API_KEY ? '✅ présente' : '❌ MANQUANTE'}`);
});
