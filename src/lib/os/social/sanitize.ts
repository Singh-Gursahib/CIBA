/** Removes em/en dashes from generated copy (house style: none). */
export function stripEmDashes(text: string): string {
  return text
    .replace(/\s+[—–]\s+/g, ", ")
    .replace(/[—–]/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}
