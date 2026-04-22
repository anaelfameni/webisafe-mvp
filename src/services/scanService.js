const API_URL = '/api';

export async function performScan(url) {
  try {
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('Erreur scan:', error);
    throw error;
  }
}