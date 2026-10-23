/** IBAN normaliseren en controleren (mod-97), puur en zonder afhankelijkheden. */

export function normaliseerIban(invoer: string): string {
  return invoer.replace(/\s+/g, "").toUpperCase();
}

export function isGeldigIban(invoer: string): boolean {
  const iban = normaliseerIban(invoer);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  if (iban.startsWith("NL") && iban.length !== 18) return false;
  const herschikt = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const teken of herschikt) {
    const waarde = /[A-Z]/.test(teken) ? String(teken.charCodeAt(0) - 55) : teken;
    for (const cijfer of waarde) rest = (rest * 10 + Number(cijfer)) % 97;
  }
  return rest === 1;
}

/** Toon alleen de laatste 4 tekens, bv. "NL•• •••• •••• ••12 34". */
export function maskeerIban(invoer: string | null | undefined): string {
  if (!invoer) return "";
  const iban = normaliseerIban(invoer);
  return `${iban.slice(0, 2)}•• •••• ${iban.slice(-4)}`;
}
