/**
 * Removes em dashes from generated content. The prompt forbids them, but this
 * is the guarantee: instructions alone are not reliable.
 */
export function stripEmDashes(text: string): string {
  return text
    // " — " between words → ", "
    .replace(/\s+[—–]\s+/g, ", ")
    // any remaining em/en dashes → comma
    .replace(/[—–]/g, ", ")
    // collapse accidental doubled punctuation
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}
