const TERM_PATTERNS = [
  { pattern: /\b(HTTPS|SSL|HSTS|Content-Security-Policy|CSP|X-Frame-Options|headers?)\b/gi, className: 'text-white font-bold' },
  { pattern: /\b(LCP|FID|CLS|Core Web Vitals|TTFB)\b/gi, className: 'text-white font-bold' },
  { pattern: /\b(SEO|meta description|balise Title|balise H1|canonical|Open Graph|sitemap\.xml|robots\.txt|attribut ALT)\b/gi, className: 'text-white font-bold' },
  { pattern: /\b(UX Mobile|responsive|viewport|éléments tactiles|interactivité|expérience mobile)\b/gi, className: 'text-white font-bold' },
];

function splitWithMatches(text, pattern) {
  const matches = Array.from(text.matchAll(pattern));
  if (matches.length === 0) {
    return [text];
  }

  const parts = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const matchedText = match[0];
    if (start > cursor) {
      parts.push(text.slice(cursor, start));
    }
    parts.push({ key: `${matchedText}-${start}-${index}`, text: matchedText });
    cursor = start + matchedText.length;
  });

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

export default function HighlightedTechText({ text, className = '' }) {
  let tokens = [text];

  TERM_PATTERNS.forEach(({ pattern, className: termClassName }) => {
    tokens = tokens.flatMap((token) => {
      if (typeof token !== 'string') {
        return [token];
      }

      return splitWithMatches(token, pattern).map((part) =>
        typeof part === 'string'
          ? part
          : { ...part, className: termClassName }
      );
    });
  });

  return (
    <span className={className}>
      {tokens.map((token, index) =>
        typeof token === 'string' ? (
          <span key={`text-${index}`}>{token}</span>
        ) : (
          <span key={token.key} className={token.className}>
            {token.text}
          </span>
        )
      )}
    </span>
  );
}
