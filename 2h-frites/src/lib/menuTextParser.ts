// Pure text → menu draft parser. No dependencies, no AI.
//
// Accepted shapes per line:
//   Cheeseburger 9.50
//   Pizza Margherita - 12
//   Tiramisu, 6.50 €
//   Coca Cola : 3
//   Soupe du jour              (no price → uncertain product)
//   BURGERS                    (all-caps header → category)
//   # Entrées                  (markdown-style header → category)
//
// Categories carry over: products after a header belong to that category until
// the next header.

export type ParsedLine =
  | { kind: 'category'; name: string; line: number }
  | { kind: 'product'; name: string; price: number | null; uncertain: boolean; category: string | null; line: number };

// Capture a trailing price: optional separator (spaces, dashes, colons,
// commas, dot-fill leaders like "......"), digits with comma/dot decimal,
// optional € symbol, end of string. Case-insensitive for 'EUR'.
// The dot/ellipsis in the separator class absorbs Word-style dot leaders
// so they don't leak into the product name.
const TRAILING_PRICE_RE = /[\s\-–—:,.…]+\s*(\d+(?:[,.]\d{1,2})?)\s*(?:€|eur|euros?)?\s*$/i;

// A line with no digits at all, reasonably short, uppercase-dominant OR starting
// with a markdown marker, is treated as a category header.
function isCategoryHeader(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (s.startsWith('#') || s.startsWith('--') || s.startsWith('==')) return true;
  if (s.length > 48) return false;
  if (/\d/.test(s)) return false;
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 2) return false;
  // Consider "all caps" or "Title Case short header" both valid.
  return letters === letters.toUpperCase();
}

function stripHeaderMarkers(raw: string): string {
  return raw.replace(/^[#=\-–—\s]+/, '').replace(/[#=\-–—\s]+$/, '').trim();
}

// Conservative Title Case header candidate: short, starts with an uppercase
// letter, no digits, no sentence punctuation, 1–5 words. Only *candidate* —
// confirmation requires priced lines following (see parseMenuText).
function looksLikeSectionHeader(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 48) return false;
  if (/\d/.test(s)) return false;
  if (/[.!?,;]$/.test(s)) return false;
  const first = s.charAt(0);
  if (first.toUpperCase() !== first || first.toLowerCase() === first) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 5) return false;
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return letters.length >= 3;
}

function normalizePrice(raw: string): number {
  // "9,50" / "9.50" → 9.5
  return parseFloat(raw.replace(',', '.'));
}

export function parseMenuText(raw: string): ParsedLine[] {
  if (!raw || !raw.trim()) return [];
  const out: ParsedLine[] = [];
  let currentCategory: string | null = null;
  const rawLines = raw.split(/\r?\n/);

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Category header?
    if (isCategoryHeader(trimmed)) {
      const name = stripHeaderMarkers(trimmed);
      if (name) {
        currentCategory = name;
        out.push({ kind: 'category', name, line: i });
      }
      continue;
    }

    // Product with trailing price?
    const match = trimmed.match(TRAILING_PRICE_RE);
    if (match) {
      const price = normalizePrice(match[1]);
      const name = trimmed.slice(0, match.index).trim();
      if (!name) continue; // "9.50" alone → skip
      if (Number.isFinite(price) && price >= 0) {
        out.push({ kind: 'product', name, price, uncertain: false, category: currentCategory, line: i });
        continue;
      }
    }

    // Section header detected by context: a title-case-looking line with no
    // price, followed by ≥2 priced lines in the next few non-empty lines.
    // Stays conservative — orphan no-price lines fall through as uncertain.
    if (looksLikeSectionHeader(trimmed)) {
      let priced = 0;
      let nonEmptySeen = 0;
      for (let j = i + 1; j < rawLines.length && nonEmptySeen < 5; j++) {
        const next = rawLines[j].trim();
        if (!next) continue;
        nonEmptySeen += 1;
        if (TRAILING_PRICE_RE.test(next)) {
          priced += 1;
          if (priced >= 2) break;
        }
      }
      if (priced >= 2) {
        currentCategory = trimmed;
        out.push({ kind: 'category', name: trimmed, line: i });
        continue;
      }
    }

    // Non-empty line, no price: uncertain product. Let the user fill the price inline.
    out.push({ kind: 'product', name: trimmed, price: null, uncertain: true, category: currentCategory, line: i });
  }

  return out;
}

// Used when saving — build a URL-safe slug from a free-form name.
export function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'item'
  );
}
