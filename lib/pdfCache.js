import { createClient } from '@supabase/supabase-js';

// Incrémenter cette valeur à chaque déploiement modifiant pdfTemplate.js ou pdfModel.js.
// Cela invalide automatiquement tous les PDFs générés avec une version antérieure du template,
// sans avoir à toucher la base de données ni le bucket.
export const PDF_TEMPLATE_VERSION = 2;

const BUCKET = 'pdf-reports';
// Timeout d'écriture : on attend au maximum 3 s pour uploader le PDF en cache
// avant de répondre au client, pour ne pas bloquer la fonction serverless.
const UPLOAD_TIMEOUT_MS = 3000;

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function cacheKey(scanId) {
  return `${scanId}_v${PDF_TEMPLATE_VERSION}.pdf`;
}

/**
 * Récupère un PDF en cache pour ce scan_id.
 * Retourne un Buffer ou null si cache manquant, expiré ou indisponible.
 * Ne lève jamais d'exception — échec silencieux → génération normale.
 */
export async function getPdfFromCache(scanId) {
  if (!scanId) return null;
  const supabase = getClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(cacheKey(scanId));
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.warn('[PDF CACHE] Lecture échouée :', e?.message || e);
    return null;
  }
}

/**
 * Stocke un PDF généré en cache pour ce scan_id.
 * Upload avec timeout : si Supabase Storage est lent, on n'attend pas indéfiniment.
 * Ne lève jamais d'exception — le PDF est toujours retourné même si le cache échoue.
 */
export async function savePdfToCache(scanId, pdfBuffer) {
  if (!scanId || !pdfBuffer) return;
  const supabase = getClient();
  if (!supabase) return;

  const upload = async () => {
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(cacheKey(scanId), pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) {
        // Bucket absent : tentative de création automatique puis ré-upload unique.
        // Évite d'avoir à créer le bucket manuellement dans le dashboard Supabase.
        const isBucketMissing = error.message?.toLowerCase().includes('bucket') ||
          error.statusCode === 404 || error.error === 'Bucket not found';

        if (isBucketMissing) {
          const { error: createError } = await supabase.storage.createBucket(BUCKET, {
            public: false,
            fileSizeLimit: 10 * 1024 * 1024, // 10 MB max par PDF
          });
          if (createError && !createError.message?.includes('already exists')) {
            console.warn('[PDF CACHE] Création bucket échouée :', createError.message);
            return;
          }
          // Ré-essai d'upload après création du bucket
          const { error: retryError } = await supabase.storage
            .from(BUCKET)
            .upload(cacheKey(scanId), pdfBuffer, { contentType: 'application/pdf', upsert: true });
          if (retryError) console.warn('[PDF CACHE] Upload (retry) échoué :', retryError.message);
        } else {
          console.warn('[PDF CACHE] Upload échoué :', error.message);
        }
      }
    } catch (e) {
      console.warn('[PDF CACHE] Exception upload :', e?.message || e);
    }
  };

  const timeout = new Promise(resolve => setTimeout(resolve, UPLOAD_TIMEOUT_MS));
  await Promise.race([upload(), timeout]);
}

/**
 * Supprime le PDF en cache pour ce scan_id (utile si les données du scan sont modifiées).
 * Ne lève jamais d'exception.
 */
export async function invalidatePdfCache(scanId) {
  if (!scanId) return;
  const supabase = getClient();
  if (!supabase) return;
  try {
    await supabase.storage.from(BUCKET).remove([cacheKey(scanId)]);
  } catch (e) {
    console.warn('[PDF CACHE] Suppression échouée :', e?.message || e);
  }
}
