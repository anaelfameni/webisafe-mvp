import { setCorsHeaders } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  return res.status(410).json({
    error: 'Cette API est obsolète. Le changement de mot de passe utilise maintenant Supabase Auth.',
  });
}
