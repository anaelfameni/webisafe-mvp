import { buildPdfAuditModel, buildPdfFilename, sanitizePdfText } from '../../lib/pdfModel.js';

export { buildPdfAuditModel, buildPdfFilename, sanitizePdfText };

function readFilenameFromDisposition(disposition) {
  const match = String(disposition || '').match(/filename="?([^";]+)"?/i);
  return match?.[1] || '';
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data?.error || data?.message || `Erreur PDF (${response.status})`;
  } catch {
    return `Erreur PDF (${response.status})`;
  }
}

export async function generatePDF(reportData) {
  if (typeof fetch === 'undefined') {
    throw new Error('La génération PDF Puppeteer doit être appelée depuis le navigateur ou une route serveur.');
  }

  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData || {}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const blob = await response.blob();

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = readFilenameFromDisposition(response.headers.get('Content-Disposition')) || buildPdfFilename(reportData);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return blob;
}
