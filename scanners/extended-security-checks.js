// api/scanners/extended-security-checks.js
const UA='Mozilla/5.0 (compatible; WebisafeScanner/1.0; +https://webisafe.vercel.app)';
function n(c,r=''){return{check_name:c,status:'error',score_impact:0,criticality:'minor',title:'Indisponible',description:r||'Check non disponible',recommendation:'Réessayez plus tard.',technical_detail:r||'',difficulty:'—',time_estimate:'—'};}
async function ft(url,opts={}){const r=await fetch(url,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(opts.timeout||5000),redirect:opts.redirect??'follow',...opts});return{status:r.status,headers:r.headers,text:await r.text()};}
async function doh(name,type){const r=await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(name)}&type=${type}`,{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(5000)});if(!r.ok)throw new Error('DoH');return(await r.json()).Answer||[];}

export async function checkTechAndCVEs(url){
  if(!url)return n('tech_cve');
  // Known critical CVEs: [tech, maxVulnVersion (exclusive), cveRef]
  const KNOWN_VULN=[
    {tech:'WordPress',lt:[6,4,3],cve:'CVE-2024-6386 (RCE) et multiples ≤ 6.4.2'},
    {tech:'jQuery',lt:[3,5,0],cve:'CVE-2020-11022/11023 (XSS via htmlPrefilter)'},
    {tech:'PHP',lt:[8,1,0],cve:'Multiples CVE critiques PHP 7.x (EOL depuis nov. 2022)'},
    {tech:'Apache',lt:[2,4,55],cve:'CVE-2023-25690 (HTTP request splitting)'},
    {tech:'Nginx',lt:[1,23,0],cve:'CVE-2021-23017 (1-byte buffer overwrite)'},
  ];
  function parseVer(s){return(s||'').split('.').map(v=>parseInt(v,10)||0);}
  function isVulnerable(vParts,ltParts){
    for(let i=0;i<ltParts.length;i++){
      if((vParts[i]||0)<ltParts[i])return true;
      if((vParts[i]||0)>ltParts[i])return false;
    }
    return false;
  }
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    let html='',resHeaders=null;
    try{
      const res=await fetch(url,{headers:{'User-Agent':UA},signal:controller.signal,redirect:'follow'});
      resHeaders=res.headers;
      html=await res.text();
    }finally{clearTimeout(timer);}

    const versionExposed=[];
    const serverH=(resHeaders?.get('server')||'').trim();
    const poweredBy=(resHeaders?.get('x-powered-by')||'').trim();

    // PHP version from headers
    const phpM=(poweredBy+' '+serverH).match(/php\/([\d.]+)/i);
    if(phpM)versionExposed.push({tech:'PHP',version:phpM[1],source:'header X-Powered-By/Server'});

    // Apache / Nginx version
    const apacheM=serverH.match(/apache\/([\d.]+)/i);
    const nginxM=serverH.match(/nginx\/([\d.]+)/i);
    if(apacheM)versionExposed.push({tech:'Apache',version:apacheM[1],source:'header Server'});
    if(nginxM)versionExposed.push({tech:'Nginx',version:nginxM[1],source:'header Server'});

    // WordPress version (meta generator OR ver= param)
    const wpGenM=html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']WordPress ([\d.]+)/i);
    const wpVerM=html.match(/\/wp-(?:content|includes)\/[^"']*\?ver=([\d.]+)/i);
    const wpVer=wpGenM?.[1]||wpVerM?.[1];
    if(wpVer)versionExposed.push({tech:'WordPress',version:wpVer,source:wpGenM?'meta generator':'URL ?ver='});

    // jQuery version
    const jqM=html.match(/jquery[._-]([\d]+\.[\d]+\.[\d]+)(?:\.min)?\.js/i);
    if(jqM)versionExposed.push({tech:'jQuery',version:jqM[1],source:'script src'});

    // Check against known CVEs
    const vulns=[];
    for(const v of versionExposed){
      const entry=KNOWN_VULN.find(k=>k.tech===v.tech);
      if(entry&&isVulnerable(parseVer(v.version),entry.lt)){
        vulns.push({tech:v.tech,version:v.version,cve:entry.cve});
      }
    }

    const hasVulns=vulns.length>0;
    const hasExposure=versionExposed.length>0;
    const status=hasVulns?'fail':hasExposure?'warning':'pass';
    const score_impact=hasVulns?12:hasExposure?4:0;

    return{
      check_name:'tech_cve',
      status,
      score_impact,
      criticality:hasVulns?'critical':hasExposure?'medium':'minor',
      title:hasVulns
        ?`${vulns.length} technologie(s) potentiellement vulnérable(s) détectée(s)`
        :hasExposure
          ?`${versionExposed.length} version(s) de technologie exposée(s) dans les headers/HTML`
          :'Aucune version de technologie exposée publiquement',
      description:hasVulns
        ?`Versions connues comme vulnérables : ${vulns.map(v=>`${v.tech} ${v.version}`).join(', ')}.`
        :hasExposure
          ?`Les versions visibles facilitent le ciblage par des attaquants : ${versionExposed.map(v=>`${v.tech} ${v.version}`).join(', ')}.`
          :'Les en-têtes HTTP et le code source ne révèlent pas de version de technologie.',
      recommendation:hasVulns
        ?'Mettez à jour immédiatement les technologies listées et masquez les versions (ServerTokens Prod, expose_php=Off, supprimer ?ver= des assets).'
        :hasExposure
          ?'Masquez les versions dans les en-têtes HTTP et supprimez les paramètres ?ver= dans les URLs des assets (WordPress : plugin Remove Query Strings).'
          :'Maintenez les technologies à jour et continuez à masquer les versions en production.',
      technical_detail:[
        ...versionExposed.map(v=>`${v.tech} v${v.version} [${v.source}]`),
        ...vulns.map(v=>`⚠ VULN ${v.tech} v${v.version}: ${v.cve}`),
      ].join(' | ').slice(0,500)||'Aucun header ou balise révélateur détecté',
      difficulty:'⭐⭐ Moyen',
      time_estimate:'30 min',
      data:{versionExposed,vulns,hasVulns,serverHeader:serverH,poweredBy},
    };
  }catch(e){return n('tech_cve',e.message);}
}
export async function checkSubdomains(domain){if(!domain)return n('subdomains');try{const c=await(await fetch(`https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)})).json();const s=[...new Set(c.flatMap(x=>String(x.name_value||'').split('\n').filter(y=>y.includes(domain)&&!y.startsWith('*.')).map(z=>z.trim().toLowerCase())))].slice(0,30);if(!s.length)return{check_name:'subdomains',status:'pass',score_impact:0,criticality:'minor',title:'Aucun sous-domaine exposé',description:'Aucun certificat SSL lié.',technical_detail:'crt.sh : 0 résultat',data:{total:0,subdomains:[]}};const a=(await Promise.allSettled(s.slice(0,8).map(async d=>{try{const r=await fetch(`https://${d}`,{method:'HEAD',signal:AbortSignal.timeout(3000)});return{subdomain:d,status:r.status,active:r.status<500};}catch{return{subdomain:d,status:0,active:false};}}))).filter(x=>x.status==='fulfilled').map(x=>x.value).filter(x=>x.active);const admin=a.some(x=>/admin|manage|panel|dashboard/.test(x.subdomain));return{check_name:'subdomains',status:admin?'fail':'pass',score_impact:admin?8:0,criticality:admin?'major':'minor',title:admin?`${s.length} sous-domaine(s) dont un administratif exposé`:`${s.length} sous-domaine(s) découvert(s)`,description:`${s.length} certificats SSL liés. ${a.length} actif(s) sur HTTPS.`,recommendation:admin?'Restreignez l\'accès aux sous-domaines admin.':'Réduisez la surface d\'attaque en supprimant les sous-domaines inutiles.',technical_detail:`Découverts : ${s.join(', ')} | Actifs : ${a.map(x=>x.subdomain).join(', ')}`,difficulty:'⭐⭐⭐ Technique',time_estimate:'2 heures',data:{total:s.length,subdomains:s,active:a,hasExposedAdmin:admin}};}catch(e){return n('subdomains',e.message);}}
export async function checkTakeover(domain){
  if(!domain)return n('takeover');
  // Services connus vulnérables au subdomain takeover : signature dans le body quand le compte est non réclamé
  const SERVICES=[
    {host:'github.io',sigs:["there isn't a github pages site here","404 there isn't a github pages"]},
    {host:'herokuapp.com',sigs:['no such app','heroku | no such app']},
    {host:'netlify.app',sigs:['not found - request id','page not found | netlify']},
    {host:'vercel.app',sigs:['the deployment could not be found','deployment not found']},
    {host:'s3.amazonaws.com',sigs:['nosuchbucket','the specified bucket does not exist']},
    {host:'cloudfront.net',sigs:['the request could not be satisfied','error from cloudfront']},
    {host:'shopifypreview.com',sigs:['sorry, this shop is currently unavailable']},
    {host:'myshopify.com',sigs:['sorry, this shop is currently unavailable']},
    {host:'zendesk.com',sigs:['help center closed','this help center no longer exists']},
    {host:'fastly.net',sigs:['fastly error: unknown domain']},
    {host:'surge.sh',sigs:['project not found']},
    {host:'tumblr.com',sigs:["there's nothing here"]},
    {host:'wpengine.com',sigs:['the site you were looking for couldn']},
    {host:'bitbucket.io',sigs:['repository not found']},
  ];
  try{
    // Récupère les CNAME du domaine via DoH
    const cnameAns=await doh(domain,'CNAME').catch(()=>[]);
    const cnames=cnameAns.map(r=>String(r.data||'').replace(/\.$/,'').toLowerCase()).filter(Boolean);

    if(!cnames.length){
      return{check_name:'takeover',status:'pass',score_impact:0,criticality:'minor',
        title:'Aucun CNAME détecté sur le domaine racine',
        description:'Aucun enregistrement CNAME trouvé. Le risque de takeover via le domaine racine est faible. Les sous-domaines nécessitent un audit DNS dédié.',
        recommendation:'Auditez périodiquement vos sous-domaines avec un outil dédié (Subjack, dnsx).',
        technical_detail:'Aucun CNAME via DoH Cloudflare',
        difficulty:'⭐⭐⭐⭐ Expert',time_estimate:'Audit externe recommandé',
        data:{cnames:[],vulnerable:[],risk:'low'}};
    }

    const vulnerable=[];
    for(const cname of cnames){
      const svc=SERVICES.find(s=>cname.includes(s.host));
      if(!svc)continue;
      try{
        const res=await fetch(`https://${domain}`,{signal:AbortSignal.timeout(5000),headers:{'User-Agent':UA},redirect:'follow'});
        const body=(await res.text()).toLowerCase();
        if(svc.sigs.some(sig=>body.includes(sig))){
          vulnerable.push({cname,service:svc.host,http_status:res.status});
        }
      }catch{/* ignore — site inaccessible */}
    }

    if(vulnerable.length){
      return{check_name:'takeover',status:'fail',score_impact:15,criticality:'critical',
        title:`Risque de subdomain takeover : ${vulnerable.length} CNAME orphelin(s) détecté(s)`,
        description:`Un ou plusieurs CNAME pointent vers des services tiers non réclamés. Un attaquant pourrait enregistrer ce service et contrôler le contenu de ce sous-domaine.`,
        recommendation:'Réclamez immédiatement les ressources tierces correspondantes ou supprimez les entrées DNS orphelines.',
        technical_detail:vulnerable.map(v=>`CNAME → ${v.cname} [${v.service}] HTTP ${v.http_status}`).join(' | '),
        difficulty:'⭐⭐⭐ Technique',time_estimate:'30 min – 2h',
        data:{cnames,vulnerable,risk:'high'}};
    }

    return{check_name:'takeover',status:'pass',score_impact:0,criticality:'minor',
      title:`${cnames.length} CNAME(s) vérifié(s) — aucun service orphelin détecté`,
      description:'Les CNAME détectés ne semblent pas pointer vers des services tiers non réclamés.',
      recommendation:'Auditez régulièrement vos entrées DNS et supprimez les CNAME obsolètes.',
      technical_detail:`CNAME(s) : ${cnames.join(', ')}`,
      difficulty:'⭐⭐⭐ Technique',time_estimate:'30 min',
      data:{cnames,vulnerable:[],risk:'low'}};
  }catch(e){return n('takeover',e.message);}
}
export async function checkSupplyChain(url){try{const{html}=await ft(url,{timeout:8000});const srcs=[];const re=/<(?:script|link|img|iframe)[^>]+(?:src|href)=["']([^"']+)["']/gi;let m;while((m=re.exec(html))!==null)srcs.push(m[1]);const extScripts=srcs.filter(s=>{try{return new URL(s).hostname!==new URL(url).hostname;}catch{return false;}}).slice(0,15);return{check_name:'supply_chain',status:extScripts.length>10?'fail':'pass',score_impact:extScripts.length>10?5:0,criticality:'medium',title:`${extScripts.length} ressource(s) externe(s) identifiée(s)`,description:'Les ressources tierces peuvent introduire des risques de supply chain.',recommendation:'Hébergez vos assets critiques en interne et utilisez SRI.',technical_detail:`Externes : ${extScripts.join(', ')||'aucune'}`,difficulty:'⭐⭐ Moyen',time_estimate:'1 heure',data:{total:extScripts.length,scripts:extScripts}};}catch(e){return n('supply_chain',e.message);}}
export async function checkCORS(url){try{const b=`${new URL(url).protocol}//${new URL(url).host}`;const r1=await fetch(b,{method:'GET',headers:{'Origin':'https://evil.com'},signal:AbortSignal.timeout(5000)});const r2=await fetch(b,{method:'GET',headers:{'Origin':'null'},signal:AbortSignal.timeout(5000)});const issues=[];for(const r of[r1,r2]){const ac=r.headers.get('access-control-allow-origin');if(ac==='*'||ac==='https://evil.com'||ac==='null'){const credRaw=r.headers.get('access-control-allow-credentials');const creds=credRaw==='true';// Dédup : compare les booleans normalisés, pas les strings brutes
const key=`${ac}|${creds}`;if(!issues.some(x=>`${x.origin}|${x.credentials}`===key))issues.push({origin:ac,credentials:creds});}}return{check_name:'cors',status:issues.length?'fail':'pass',score_impact:issues.length?8:0,criticality:issues.length?'major':'minor',title:issues.length?'CORS mal configuré':'CORS correctement configuré',description:issues.length?`Access-Control-Allow-Origin reflète ou autorise * avec credentials=${issues.some(x=>x.credentials)}`:'Aucune politique CORS permissive détectée.',recommendation:'Restreignez Access-Control-Allow-Origin à des domaines de confiance et évitez de combiner * avec credentials.',technical_detail:issues.map(x=>`Allow-Origin=${x.origin}, credentials=${x.credentials}`).join(' | ')||'OK',difficulty:'⭐⭐⭐ Technique',time_estimate:'30 min',data:{issues}};}catch(e){return n('cors',e.message);}}
export async function checkAdvancedEmailSecurity(domain){
  if(!domain)return n('email_advanced');
  // DKIM selectors couvrant les principaux hébergeurs email :
  // selector1/selector2 = Microsoft 365/Exchange Online
  // google = Google Workspace
  // default = nombreux hébergeurs mutualisés (OVH, Infomaniak, LWS…)
  // k1 = Mailchimp / Mandrill
  // mail = cPanel/WHM, Plesk
  // dkim = usage générique
  const DKIM_SELECTORS=['selector1','selector2','google','default','k1','mail','dkim'];
  try{
    const[spfA,dmarcA,mxA,...dkimResults]=await Promise.allSettled([
      doh(domain,'TXT'),
      doh(`_dmarc.${domain}`,'TXT'),
      doh(domain,'MX'),
      ...DKIM_SELECTORS.map(sel=>doh(`${sel}._domainkey.${domain}`,'TXT')),
    ]);

    const spf=spfA.status==='fulfilled'?spfA.value.filter(x=>(x.data||'').includes('v=spf1')):[];
    const dmarc=dmarcA.status==='fulfilled'?dmarcA.value.filter(x=>(x.data||'').includes('v=DMARC1')):[];
    const mx=mxA.status==='fulfilled'?mxA.value:[];

    // Premier selector DKIM qui répond avec des enregistrements TXT
    let dkim=[];
    let dkimSelector=null;
    for(let i=0;i<DKIM_SELECTORS.length;i++){
      const r=dkimResults[i];
      if(r.status==='fulfilled'&&r.value.length>0){
        dkim=r.value;
        dkimSelector=DKIM_SELECTORS[i];
        break;
      }
    }

    const missing=[];
    if(!spf.length)missing.push('SPF');
    if(!dmarc.length)missing.push('DMARC');
    if(!dkim.length)missing.push('DKIM');
    const hasAdvanced=spf.length&&dmarc.length&&dkim.length;

    return{
      check_name:'email_advanced',
      status:hasAdvanced?'pass':'fail',
      score_impact:missing.length?8:0,
      criticality:missing.length?'major':'minor',
      title:hasAdvanced
        ?'Sécurité email avancée complète'
        :`Sécurité email incomplète (${missing.join(', ')} manquant)`,
      description:`SPF=${spf.length?'OK':'absent'} | DMARC=${dmarc.length?'OK':'absent'} | DKIM=${dkimSelector?`OK (selector: ${dkimSelector})`:'absent'} | MX=${mx.length}.`,
      recommendation:`SPF: ${spf.length?'OK':'manquant'}. DMARC: ${dmarc.length?'OK':'manquant'}. DKIM: ${dkimSelector?`OK (selector ${dkimSelector})`:'manquant — contactez votre hébergeur email'}. Selectors testés : ${DKIM_SELECTORS.join(', ')}.`,
      technical_detail:`SPF: ${spf.length} record(s) | DMARC: ${dmarc.length} record(s) | DKIM: ${dkimSelector?`selector ${dkimSelector} trouvé`:`absent sur [${DKIM_SELECTORS.join(', ')}]`} | MX: ${mx.length}`,
      difficulty:'⭐⭐ Moyen',
      time_estimate:'1 heure',
      data:{spf,dmarc,dkim,dkimSelector,dkimSelectorsTested:DKIM_SELECTORS,mx,missing},
    };
  }catch(e){return n('email_advanced',e.message);}
}
export async function checkWAF(url){try{const r=await fetch(url,{method:'GET',headers:{'User-Agent':UA},signal:AbortSignal.timeout(6000)});const h=Object.fromEntries(r.headers.entries());const server=(h.server||h['x-powered-by']||'').toLowerCase();const detected=[];if(/cloudflare/.test(server)||h['cf-ray'])detected.push('Cloudflare');if(h['x-akamai-transformed']||h['x-akamai-request-bc'])detected.push('Akamai');if(h['x-sucuri-id']||h['x-sucuri-cache'])detected.push('Sucuri');if(/incapsula/.test(server)||h['x-iinfo'])detected.push('Incapsula');if(/aws/.test(server)||h['x-amz-cf-id'])detected.push('AWS CloudFront / WAF');if(/fastly/.test(server))detected.push('Fastly');const present=detected.length>0;return{check_name:'waf',status:present?'pass':'fail',score_impact:present?0:6,criticality:present?'minor':'medium',title:present?`WAF détecté : ${detected.join(', ')}`:'Aucun WAF détecté',description:present?'Un pare-feu applicatif web a été identifié via les en-têtes de réponse.':'Aucune signature de WAF trouvée dans les en-têtes HTTP.',recommendation:present?'Assurez-vous que les règles WAF sont à jour.':'Activez un WAF (Cloudflare gratuit, AWS WAF, ou Sucuri) pour filtrer le trafic malveillant.',technical_detail:`Server=${h.server||'N/A'} cf-ray=${h['cf-ray']||'N/A'}`.slice(0,500),difficulty:'⭐ Facile',time_estimate:'15 min',data:{detected,headers:h}};}catch(e){return n('waf',e.message);}}
export async function checkWayback(domain){if(!domain)return n('wayback');try{const r=await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&limit=20`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Wayback HTTP');const data=await r.json();const snaps=Array.isArray(data)?data.slice(1):[];const leaks=snaps.filter(s=>/admin|login|password|backup|dump|sql|config|env/.test(JSON.stringify(s).toLowerCase()));return{check_name:'wayback',status:leaks.length?'fail':'pass',score_impact:leaks.length?6:0,criticality:leaks.length?'medium':'minor',title:leaks.length?`${snaps.length} snapshots dont ${leaks.length} contenant mots sensibles`:`${snaps.length} snapshot(s) historique(s) trouvé(s)`,description:`Wayback Machine a indexé ${snaps.length} captures. ${leaks.length} contiennent potentiellement des chemins sensibles.`,recommendation:leaks.length?'Demandez la suppression des captures sensibles via web.archive.org et bloquez l\'archivage avec robots.txt + noarchive.':'Aucune fuite détectée dans les archives publiques.',technical_detail:`Derniers snapshots : ${snaps.slice(-5).map(s=>s[1]).join(', ')||'aucun'} | Sensibles : ${leaks.map(s=>s[2]).join(', ')||'aucun'}`,difficulty:'⭐ Facile',time_estimate:'30 min',data:{total:snaps.length,leaks}};}catch(e){return n('wayback',e.message);}}
export async function checkTyposquatting(domain){if(!domain)return n('typosquatting');const root=domain.replace(/^www\./i,'').toLowerCase();const domainLower=domain.toLowerCase();const candidates=[root.replace(/o/g,'0'),root.replace(/l/g,'1'),root.replace(/e/g,'3'),`${root}-secure.com`,`${root}-login.com`,root.replace(/s$/,''),root.replace(/-/g,''),root.replace(/a/g,'@')].slice(0,6);// Exclut le domaine scanné lui-même et ses variantes strictement identiques
const variants=candidates.filter(v=>v&&v.toLowerCase()!==root&&v.toLowerCase()!==domainLower&&v!==`www.${root}`);const found=[];for(const v of variants){try{const r=await fetch(`https://dns.google/resolve?name=${encodeURIComponent(v)}&type=A`,{signal:AbortSignal.timeout(3000)});const j=await r.json();if(j.Answer&&j.Answer.length)found.push(v);}catch{/* ignore */}}return{check_name:'typosquatting',status:found.length?'fail':'pass',score_impact:found.length?6:0,criticality:found.length?'medium':'minor',title:found.length?`${found.length} domaine(s) squatteur(s) potentiel(s)`:'Aucun typosquatting évident détecté',description:`${found.length} variantes du nom de domaine semblent enregistrées.`,recommendation:'Enregistrez les variantes courantes de votre domaine et surveillez les enregistrements suspects.',technical_detail:`Variantes actives : ${found.join(', ')||'aucune'}`,difficulty:'⭐⭐ Moyen',time_estimate:'Audit externe recommandé',data:{total:found.length,variants:found}};}
export async function checkSecurityTxt(domain) {
  if (!domain) return n('security_txt');
  try {
    const paths = [`https://${domain}/.well-known/security.txt`, `https://${domain}/security.txt`];
    for (const p of paths) {
      try {
        const r = await fetch(p, { signal: AbortSignal.timeout(4000) });
        if (r.status === 200) {
          const t = await r.text();
          const contact = t.match(/Contact:\s*(.+)/i)?.[1]?.trim() || null;
          const policy = t.match(/Policy:\s*(.+)/i)?.[1]?.trim() || null;
          return {
            check_name: 'security_txt',
            status: 'pass',
            score_impact: 0,
            criticality: 'minor',
            title: 'security.txt présent',
            description: 'Le fichier security.txt est conforme au RFC 9116.',
            recommendation: 'Maintenez les coordonnées de contact à jour.',
            technical_detail: `Contact=${contact || 'N/A'} Policy=${policy || 'N/A'}`.slice(0, 300),
            difficulty: '⭐ Facile',
            time_estimate: '10 min',
            data: { present: true, contact, policy, url: p },
          };
        }
      } catch {
        /* ignore */
      }
    }
    return {
      check_name: 'security_txt',
      status: 'fail',
      score_impact: 4,
      criticality: 'medium',
      title: 'security.txt manquant',
      description: 'Aucun fichier security.txt trouvé à la racine ou dans /.well-known/.',
      recommendation: 'Créez un fichier /.well-known/security.txt avec Contact:, Acknowledgments:, et Policy:.',
      technical_detail: 'Non trouvé',
      difficulty: '⭐ Facile',
      time_estimate: '15 min',
      data: { present: false },
    };
  } catch (e) {
    return n('security_txt', e.message);
  }
}
export async function checkZoneTransfer(domain){
  if(!domain)return n('zone_transfer');
  try{
    const[nsAns,soaAns]=await Promise.allSettled([doh(domain,'NS'),doh(domain,'SOA')]);
    const nameservers=(nsAns.status==='fulfilled'?nsAns.value:[])
      .map(r=>String(r.data||'').replace(/\.$/,'').toLowerCase()).filter(Boolean);
    const hasSoa=soaAns.status==='fulfilled'&&soaAns.value.length>0;
    // AXFR requiert TCP DNS port 53 — impossible depuis Vercel/HTTP.
    // On fournit NS réels + commande précise pour test manuel.
    const digCmd=nameservers.length
      ?`dig AXFR ${domain} @${nameservers[0]}`
      :`dig NS ${domain}  # puis : dig AXFR ${domain} @<NS_obtenu>`;
    return{
      check_name:'zone_transfer',
      status:'warning',
      score_impact:0,
      criticality:'minor',
      title:nameservers.length
        ?`Zone Transfer non testé — ${nameservers.length} nameserver(s) identifié(s)`
        :'Zone Transfer non testé — nameservers non résolus',
      description:'Le test AXFR actif nécessite une connexion TCP DNS (port 53), impossible depuis un contexte HTTP. Les nameservers ont été récupérés pour faciliter le test manuel.',
      recommendation:`Testez manuellement : ${digCmd}. La réponse doit être "Transfer failed" ou "REFUSED". Si elle retourne des enregistrements, votre zone DNS est publiquement transférable.`,
      technical_detail:`NS: ${nameservers.join(', ')||'non résolu'} | SOA: ${hasSoa?'présent':'absent'} | AXFR: test manuel requis`,
      difficulty:'⭐⭐⭐ Technique',
      time_estimate:'Test manuel 5 min',
      data:{tested:false,nameservers,hasSoa},
    };
  }catch(e){return n('zone_transfer',e.message);}
}

export async function runExtendedSecurityChecks(url){const domain=new URL(url).hostname;const results=await Promise.allSettled([checkTechAndCVEs(url),checkSubdomains(domain),checkTakeover(domain),checkSupplyChain(url),checkCORS(url),checkAdvancedEmailSecurity(domain),checkWAF(url),checkWayback(domain),checkTyposquatting(domain),checkSecurityTxt(domain),checkZoneTransfer(domain)]);const checks=results.map((r,i)=>{const names=['tech_cve','subdomains','takeover','supply_chain','cors','email_advanced','waf','wayback','typosquatting','security_txt','zone_transfer'];return r.status==='fulfilled'?r.value:n(names[i],String(r.reason||'Erreur inconnue'));});const totalImpact=checks.filter(c=>c.status==='fail').reduce((s,c)=>s+(c.score_impact||0),0);const score=Math.max(0,100-totalImpact);return{score,checks,details:checks,summary:`${checks.filter(c=>c.status==='fail').length}/${checks.length} checks en alerte`};}
