async function postEmail(path, payload) {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Erreur email');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erreur email:', error);
    return { success: false, error: error.message };
  }
}

export function sendNurtureEmail(payload) {
  return postEmail('/api/send-nurture', payload);
}

export function sendProtectReceiptEmail(payload) {
  return postEmail('/api/send-protect-receipt', payload);
}

export function sendAlertFollowUpEmail(payload) {
  return postEmail('/api/send-alert-followup', payload);
}
