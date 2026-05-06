const number = (value) => (Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0);

function headerPresenceRows(model) {
  const missing = new Set((model.sections.security.missingHeaders || []).map((item) => String(item.header || '').toLowerCase()));
  const labels = ['CSP', 'HSTS', 'X-Frame', 'CORS', 'Referrer', 'Cookies'];
  return labels.map((label) => ({ label, present: missing.has(label.toLowerCase()) ? 0 : 1 }));
}

export function buildChartsScript(model) {
  const categories = model.cover.categoryScores.map((item) => ({ label: item.label, score: number(item.score) }));
  const statuses = ['OK', 'À corriger', 'Critique', 'Non mesuré'];
  const allStatuses = [
    ...model.sections.performance.metrics,
    ...model.sections.security.metrics,
    ...model.sections.seo.metrics,
    ...model.sections.ux.metrics,
    ...(model.sections.advancedSecurity.checks || []),
  ].map((item) => item.status);
  const statusCounts = statuses.map((status) => allStatuses.filter((item) => item === status).length);
  const headers = headerPresenceRows(model);

  return `
    window.chartsReady = false;
    const chartFont = { family: 'Inter, Arial, sans-serif' };
    Chart.defaults.font.family = chartFont.family;
    Chart.defaults.color = '#94A3B8';
    new Chart(document.getElementById('scoreGauge'), {
      type: 'doughnut',
      data: { datasets: [{ data: [${number(model.scores.global)}, ${100 - number(model.scores.global)}], backgroundColor: ['${model.cover.scoreColor}', '#1E293B'], borderWidth: 0, circumference: 220, rotation: 250 }] },
      options: { animation: false, responsive: true, maintainAspectRatio: false, cutout: '76%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
    new Chart(document.getElementById('categoryRadar'), {
      type: 'radar',
      data: { labels: ${JSON.stringify(categories.map((item) => item.label))}, datasets: [{ label: 'Score', data: ${JSON.stringify(categories.map((item) => item.score))}, backgroundColor: 'rgba(21,102,240,0.2)', borderColor: '#1566F0', pointBackgroundColor: '#38BDF8', pointBorderWidth: 0, borderWidth: 2 }] },
      options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false }, grid: { color: '#334155' }, angleLines: { color: '#334155' }, pointLabels: { color: '#CBD5E1', font: { size: 10, weight: 700 } } } }, plugins: { legend: { display: false } } }
    });
    new Chart(document.getElementById('statusDonut'), {
      type: 'doughnut',
      data: { labels: ${JSON.stringify(statuses)}, datasets: [{ data: ${JSON.stringify(statusCounts)}, backgroundColor: ['#22C55E', '#F97316', '#EF4444', '#64748B'], borderWidth: 0 }] },
      options: { animation: false, responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, usePointStyle: true, padding: 14 } } } }
    });
    new Chart(document.getElementById('headersBar'), {
      type: 'bar',
      data: { labels: ${JSON.stringify(headers.map((item) => item.label))}, datasets: [{ label: 'Présent', data: ${JSON.stringify(headers.map((item) => item.present))}, backgroundColor: '#1566F0', borderRadius: 8 }, { label: 'Manquant', data: ${JSON.stringify(headers.map((item) => item.present ? 0 : 1))}, backgroundColor: '#EF4444', borderRadius: 8 }] },
      options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#CBD5E1' } }, y: { stacked: true, display: false, max: 1 } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, usePointStyle: true } } } }
    });
    requestAnimationFrame(() => { window.chartsReady = true; });
  `;
}
