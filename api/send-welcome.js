import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null;
const resend = new Resend(process.env.RESEND_API_KEY);

function generateTopIssues(result) {
  const issues = [];
  const sec = result.metrics?.security;
  const perf = result.metrics?.performance;

  if (perf?.lcp && perf.lcp > 2500) issues.push(`Performance: LCP à ${Math.round(perf.lcp)}ms — vos images ralentissent le chargement`);
  if (sec?.ssl_grade && !['A', 'A+'].includes(sec.ssl_grade)) issues.push(`SSL: Note ${sec.ssl_grade} — passez à TLS 1.3`);
  if (sec?.missing_headers?.length) issues.push(`Sécurité: ${sec.missing_headers.length} header(s) critique(s) manquant(s)`);
  if (perf?.cls && perf.cls > 0.1) issues.push(`Stabilité visuelle: CLS à ${perf.cls.toFixed(2)} — vos éléments bougent au chargement`);
  if (sec?.malware_detected) issues.push('🚨 Malware détecté — action immédiate requise');

  // Extended checks
  if (Array.isArray(sec?.extended_checks)) {
    const fails = sec.extended_checks.filter(c => c.status === 'fail').slice(0, 2);
    for (const f of fails) {
      issues.push(`Avancé: ${f.title}`);
    }
  }

  while (issues.length < 3) {
    issues.push('Opportunité: Ajoutez un WAF et hardenez vos headers de sécurité');
  }
  return issues.slice(0, 5);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, result } = req.body;
  if (!email || !result) return res.status(400).json({ error: 'Email et résultat requis' });

  const score = result.global_score ?? result.score ?? 'N/A';
  const grade = result.grade ?? '—';
  const url = result.url ?? 'votre site';
  const issues = generateTopIssues(result);

  const issueList = issues.map(i => `<li style="margin-bottom:8px;padding-left:24px;position:relative"><span style="position:absolute;left:0;color:#ef4444">●</span>${i}</li>`).join('');

  const rapportUrl = `https://webisafe.ci/rapport/${result.scan_id ?? ''}`;

  try {
    await resend.emails.send({
      from: 'Webisafe <onboarding@resend.dev>',
      to: email,
      subject: `Votre audit de sécurité pour ${url} — score ${score}/100`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;color:#1f2937">
          <div style="background:#0f172a;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:24px">Votre rapport Webisafe</h1>
            <p style="color:#94a3b8;margin:8px 0 0">${url}</p>
          </div>
          <div style="background:#fff;padding:32px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="display:inline-block;background:#f1f5f9;border-radius:16px;padding:16px 32px">
                <p style="font-size:48px;font-weight:800;color:#0f172a;margin:0">${score}<span style="font-size:20px;color:#64748b">/100</span></p>
                <p style="color:#64748b;font-size:14px;margin:4px 0 0">Grade ${grade}</p>
              </div>
            </div>

            <h2 style="font-size:18px;margin:0 0 16px">Top priorités à corriger</h2>
            <ol style="padding:0;margin:0;list-style:none">${issueList}</ol>

            <div style="margin:24px 0;text-align:center">
              <a href="${rapportUrl}" style="display:inline-block;background:#1566f0;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600">Voir le rapport complet</a>
            </div>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>

            <p style="color:#64748b;font-size:14px;margin:0 0 8px">Besoin d'aide pour corriger ces problèmes ?</p>
            <a href="https://webisafe.ci/tarifs" style="color:#1566f0;font-weight:600;text-decoration:none">Voir l'offre Audit+Fix — 75 000 FCFA</a>

            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Webisafe · Abidjan · CI</p>
          </div>
        </div>
      `,
    });

    if (supabase) {
      await supabase.from('scan_emails').insert({ email, url_scanned: url, scan_id: result.scan_id, score, sent_at: new Date().toISOString() });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-welcome] error:', err);
    return res.status(500).json({ error: 'Erreur envoi email' });
  }
}
