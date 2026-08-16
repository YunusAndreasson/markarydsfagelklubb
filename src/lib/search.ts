/**
 * Diacritic-insensitive folding for the app's search fields.
 *
 * Every list you search here is Swedish: ~300 arter (Havsörn, Sångsvan, Ärtsångare)
 * and ~60 lokaler (Åmot, Ängabäck, Hylteskogen). A plain `toLowerCase().includes()`
 * makes those letters a wall — typing "havsorn" on a phone keyboard, or "angaback"
 * because å/ä/ö are a long-press away, matched nothing at all. Worse, it failed
 * silently: the list just went empty, which reads as "we don't have that bird".
 *
 * So both sides of the comparison are folded to their base letters first: the
 * needle once, each candidate as it's scanned. "havsorn", "havsörn" and "HAVSÖRN"
 * all find Havsörn, and typing the diacritic still works exactly as before.
 *
 * NFD decomposition handles every letter that IS a base + accent (å → a + ring).
 * The table below covers the rest: letters that are their own codepoint with no
 * decomposition (ø, æ, ß, đ) — and it doubles as the fallback if a JS engine
 * ships without full Unicode normalization.
 */
const FOLD_EXTRA: Record<string, string> = {
  å: 'a', ä: 'a', ö: 'o', á: 'a', à: 'a', â: 'a', ã: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ø: 'o', œ: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  ñ: 'n', ç: 'c', š: 's', ž: 'z', č: 'c', ř: 'r',
  æ: 'a', ß: 'ss', đ: 'd', ð: 'd', þ: 't', ł: 'l',
};

/** Lowercase + strip diacritics, so "havsorn" matches "Havsörn". */
export function foldSearch(value: string): string {
  let out = value.toLowerCase();
  try {
    // Splits å into "a" + combining ring, then drops the combining marks
    // (U+0300–U+036F). Escaped, not literal: the raw marks are invisible in a
    // source file and any editor that normalizes the file would eat them.
    out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    // No Unicode normalization in this engine — the table below still covers
    // every letter these lists actually contain.
  }
  // Anything non-ASCII that survived is either an undecomposable letter (ø, æ)
  // or normalization was unavailable; map what we know and leave the rest.
  return out.replace(/[^\u0000-\u007f]/g, (c) => FOLD_EXTRA[c] ?? c);
}

/** True when `haystack` contains `needle`, both folded. Fold the needle once
 *  outside a loop and call {@link foldSearch} on candidates directly instead. */
export function foldIncludes(haystack: string, needle: string): boolean {
  return foldSearch(haystack).includes(foldSearch(needle));
}
