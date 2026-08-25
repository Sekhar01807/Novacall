const NAMED_ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#x27;': "'",
    '&#39;': "'"
};

/**
 * Decode HTML entities in text strings so that text can safely be rendered
 * as standard React JSX text nodes without double-encoding artifacts (e.g. AT&amp;T -> AT&T).
 * Single-pass regex substitution prevents double-decoding vulnerabilities.
 * 
 * @param {string} text - Raw string possibly containing HTML entity escapes
 * @returns {string} - Decoded plain text string
 */
export const decodeHTMLEntities = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/&(?:amp|lt|gt|quot|apos|#x27|#39|#x[0-9a-fA-F]+|#\d+);/g, (match) => {
        if (NAMED_ENTITIES[match]) {
            return NAMED_ENTITIES[match];
        }
        if (match.startsWith('&#x') || match.startsWith('&#X')) {
            const hex = match.slice(3, -1);
            const code = parseInt(hex, 16);
            return !isNaN(code) && code > 0 ? String.fromCodePoint(code) : match;
        }
        if (match.startsWith('&#')) {
            const dec = match.slice(2, -1);
            const code = parseInt(dec, 10);
            return !isNaN(code) && code > 0 ? String.fromCodePoint(code) : match;
        }
        return match;
    });
};
