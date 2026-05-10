import { resolve as resolveDns } from 'node:dns/promises';

function isMethodAccessible(status) {
  return status >= 200 && status < 400;
}

export async function checkHttpMethods(url) {
  const testedMethods = ['OPTIONS', 'TRACE', 'PUT', 'DELETE', 'PROPFIND'];
  const methods = {};
  let allowHeader = '';

  await Promise.all(testedMethods.map(async (method) => {
    try {
      const response = await fetch(url, {
        method,
        signal: AbortSignal.timeout(3_500),
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
      });
      const allow = response.headers?.get?.('allow') || response.headers?.get?.('access-control-allow-methods') || '';
      if (method === 'OPTIONS' && allow) allowHeader = allow;
      methods[method] = {
        status: response.status,
        allowed: isMethodAccessible(response.status) || new RegExp(`\\b${method}\\b`, 'i').test(allow),
      };
    } catch (error) {
      methods[method] = {
        status: 0,
        allowed: false,
        error: error?.name || 'FETCH_ERROR',
      };
    }
  }));

  const allowedMethods = allowHeader
    .split(',')
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean);
  const traceEnabled = methods.TRACE?.allowed || allowedMethods.includes('TRACE');
  const writeMethodsAccessible = ['PUT', 'DELETE'].filter((method) => methods[method]?.allowed || allowedMethods.includes(method));
  const webdavExposed = methods.PROPFIND?.allowed || allowedMethods.includes('PROPFIND');
  const riskyMethods = [
    traceEnabled ? 'TRACE' : null,
    ...writeMethodsAccessible,
    webdavExposed ? 'PROPFIND' : null,
  ].filter(Boolean);

  return {
    status: riskyMethods.length ? 'warning' : 'pass',
    tested_methods: testedMethods,
    allowed_methods: allowedMethods,
    methods,
    risky: riskyMethods,
    risky_methods: riskyMethods,
    trace_enabled: traceEnabled,
    write_methods_accessible: writeMethodsAccessible,
    webdav_exposed: webdavExposed,
    too_permissive: riskyMethods.length > 0,
  };
}

export async function checkDnssec(domain) {
  const resolver = globalThis.Dns?.resolve || resolveDns;

  try {
    const dsRecords = await resolver(domain, 'DS');
    const count = Array.isArray(dsRecords) ? dsRecords.length : 0;
    return {
      status: count > 0 ? 'pass' : 'warning',
      ds_records_found: count,
      message: count > 0 ? `${count} enregistrement(s) DS détecté(s).` : 'Aucun enregistrement DS détecté.',
      recommendation: count > 0 ? 'DNSSEC actif côté registre.' : 'Activer DNSSEC chez le registrar et publier un enregistrement DS.',
    };
  } catch (error) {
    const code = error?.code || error?.name || 'DNS_ERROR';
    const absent = ['ENODATA', 'ENOTFOUND', 'ENODOMAIN', 'NOTFOUND'].includes(code);
    return {
      status: absent ? 'warning' : 'error',
      ds_records_found: 0,
      message: absent ? 'Aucun enregistrement DS détecté.' : `Validation DNSSEC impossible (${code}).`,
      recommendation: 'Vérifier la configuration DNSSEC auprès du registrar.',
    };
  }
}

async function fetchWordPressProbe(baseUrl, path) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_500),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });
    return { status: response.status, text: await response.text().catch(() => '') };
  } catch {
    return { status: 0, text: '' };
  }
}

export async function scanWordPressSecurity(url, html, cmsDetection) {
  const isWordPress = cmsDetection?.primary === 'WordPress' || cmsDetection?.detected?.some((item) => item.name === 'WordPress');

  if (!isWordPress) {
    return {
      applicable: false,
      status: 'not_measured',
      checks: [],
    };
  }

  const baseUrl = new URL(url).origin;
  const [login, xmlrpc, users, readme, pluginsDirectory] = await Promise.all([
    fetchWordPressProbe(baseUrl, '/wp-login.php'),
    fetchWordPressProbe(baseUrl, '/xmlrpc.php'),
    fetchWordPressProbe(baseUrl, '/wp-json/wp/v2/users'),
    fetchWordPressProbe(baseUrl, '/readme.html'),
    fetchWordPressProbe(baseUrl, '/wp-content/plugins/'),
  ]);
  const pluginMatches = [...String(html || '').matchAll(/\/wp-content\/plugins\/([^/'")\s]+)/gi)].map((match) => match[1]);
  const uniquePlugins = [...new Set(pluginMatches)];
  const versionFromHtml = String(html || '').match(/WordPress\s+([0-9.]+)/i)?.[1] || null;
  const versionFromReadme = readme.text.match(/Version\s+([0-9.]+)/i)?.[1] || null;
  const checks = [
    login.status === 200 && /wp-submit|wp-login|wordpress|login/i.test(login.text) ? { label: '/wp-login.php visible', path: '/wp-login.php' } : null,
    xmlrpc.status === 200 && /xml-rpc|xmlrpc/i.test(xmlrpc.text) ? { label: '/xmlrpc.php actif', path: '/xmlrpc.php' } : null,
    users.status === 200 && /^\s*\[/.test(users.text) ? { label: '/wp-json/wp/v2/users exposé', path: '/wp-json/wp/v2/users' } : null,
    versionFromHtml || versionFromReadme ? { label: `Version WordPress exposée${versionFromHtml || versionFromReadme ? ` (${versionFromHtml || versionFromReadme})` : ''}`, path: 'generator/readme.html' } : null,
    readme.status === 200 && /wordpress|version/i.test(readme.text) ? { label: 'readme.html accessible', path: '/readme.html' } : null,
    uniquePlugins.length ? { label: `${uniquePlugins.length} plugin(s) visible(s) dans le HTML`, path: '/wp-content/plugins/*' } : null,
    pluginsDirectory.status === 200 && /index of|parent directory/i.test(pluginsDirectory.text) ? { label: 'Directory listing potentiel sur plugins', path: '/wp-content/plugins/' } : null,
  ].filter(Boolean);

  return {
    applicable: true,
    status: checks.length ? 'warning' : 'pass',
    wp_login_visible: checks.some((check) => check.path === '/wp-login.php'),
    xmlrpc_active: checks.some((check) => check.path === '/xmlrpc.php'),
    users_exposed: checks.some((check) => check.path === '/wp-json/wp/v2/users'),
    version_exposed: Boolean(versionFromHtml || versionFromReadme),
    readme_accessible: checks.some((check) => check.path === '/readme.html'),
    plugins_visible: uniquePlugins,
    directory_listing_potential: checks.some((check) => check.path === '/wp-content/plugins/'),
    checks,
  };
}
