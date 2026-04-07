import he from 'he';

/**
 * Decodes HTML entities (e.g., &#8216; to ', &amp; to &)
 * into readable characters.
 */
export const decodeHtml = (text: string | undefined): string => {
  if (!text) return '';
  try {
    // 1. he.decode handles both numeric and named entities
    let decoded = he.decode(text);
    
    // 2. Global deep clean regex for any leftover entities (like &#8211; or &nbsp;)
    // and standard punctuation normalization
    decoded = decoded
      .replace(/&#x?[0-9a-fA-F]+;/g, '') // Remove hex/numeric entities
      .replace(/&[a-z]+;/g, '') // Remove named entities not caught by he
      .replace(/&nbsp;/g, ' ') // Replace non-breaking space
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
      
    return decoded;
  } catch (error) {
    console.warn('HTML decoding failed, returning original text:', error);
    return text;
  }
};
