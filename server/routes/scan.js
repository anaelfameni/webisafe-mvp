import { Router } from 'express';
import { handleScan } from '../controllers/scanController.js';

const router = Router();

// ── Validation URL middleware ──────────────────────────────────────────────────
function validateURL(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Le champ "url" est requis.',
    });
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return res.status(400).json({
      success: false,
      error: 'URL invalide. Utilisez le format https://votresite.ci',
    });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({
      success: false,
      error: 'Seuls les protocoles HTTP et HTTPS sont acceptés.',
    });
  }

  // Normalise l'URL et la ré-injecte
  req.body.url = parsed.href;
  next();
}

// ── POST /api/scan ─────────────────────────────────────────────────────────────
router.post('/', validateURL, handleScan);

export default router;
