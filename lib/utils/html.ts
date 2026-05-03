function matchAll(input: string, regex: RegExp) {
  return Array.from(input.matchAll(regex));
}

export function getTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
}

export function getMetaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
  ];

  for (const pattern of patterns) {
    const result = html.match(pattern)?.[1];
    if (result) return result.trim();
  }

  return '';
}

export function countTag(html: string, tagName: string) {
  return (html.match(new RegExp(`<${tagName}\\b`, 'gi')) || []).length;
}

export function extractHeadingLevels(html: string) {
  return matchAll(html, /<(h[1-6])\b[^>]*>/gi).map((match) => Number(match[1].slice(1)));
}

export function hasMediaQueries(html: string) {
  return /@media\s*\(/i.test(html) || /media=["'][^"']*(max-width|min-width)/i.test(html);
}

export function countResponsiveImages(html: string) {
  return {
    srcset: (html.match(/\bsrcset=/gi) || []).length,
    picture: countTag(html, 'picture'),
  };
}

export function countImagesWithAlt(html: string) {
  const images = matchAll(html, /<img\b[^>]*>/gi).map((match) => match[0]);
  const withAlt = images.filter((image) => /\balt=["'][^"']+["']/i.test(image)).length;
  return {
    total: images.length,
    withAlt,
    ratio: images.length ? withAlt / images.length : 1,
  };
}

export function getCanonicalUrl(html: string) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() || '';
}

export function hasStructuredData(html: string) {
  return /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
}

export function getOpenGraphTags(html: string) {
  const tags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  return tags.filter((tag) => Boolean(getMetaContent(html, tag)));
}

export function getTwitterTags(html: string) {
  const tags = ['twitter:card', 'twitter:title', 'twitter:image'];
  return tags.filter((tag) => Boolean(getMetaContent(html, tag)));
}

export function estimateBodyFontSize(html: string) {
  const bodyStyle = html.match(/<body[^>]+style=["']([^"']+)["']/i)?.[1] || '';
  const styleBlock = html.match(/body\s*\{[^}]*font-size:\s*([0-9.]+)px/i)?.[1];
  const inlineStyle = bodyStyle.match(/font-size:\s*([0-9.]+)px/i)?.[1];
  return Number(inlineStyle || styleBlock || 16);
}

export function estimateLineHeight(html: string) {
  const bodyStyle = html.match(/<body[^>]+style=["']([^"']+)["']/i)?.[1] || '';
  const styleBlock = html.match(/body\s*\{[^}]*line-height:\s*([0-9.]+)/i)?.[1];
  const inlineStyle = bodyStyle.match(/line-height:\s*([0-9.]+)/i)?.[1];
  return Number(inlineStyle || styleBlock || 1.5);
}

export function hasUserScalableDisabled(html: string) {
  const viewport = getMetaContent(html, 'viewport');
  return /user-scalable\s*=\s*no/i.test(viewport);
}

export function countCdnScriptsWithoutSri(html: string) {
  const scripts = matchAll(html, /<script\b[^>]+src=["']([^"']+)["'][^>]*>/gi).map((match) => match[0]);
  return scripts.filter((script) => /^<script[^>]+src=["']https?:\/\//i.test(script) && !/\bintegrity=/i.test(script)).length;
}

export function inferHamburgerMenu(html: string) {
  return /(hamburger|mobile-menu|menu-toggle|navbar-toggle|drawer)/i.test(html);
}

export function inferStickyNavigation(html: string) {
  return /(position:\s*sticky|sticky-top|fixed-top|navbar-fixed)/i.test(html);
}

export function inferSmoothScroll(html: string) {
  return /(scroll-behavior:\s*smooth|lenis|locomotive-scroll)/i.test(html);
}

export function getWordPressVersion(html: string) {
  const generator = getMetaContent(html, 'generator');
  const match = generator.match(/WordPress\s+([0-9.]+)/i);
  return match?.[1] || '';
}
