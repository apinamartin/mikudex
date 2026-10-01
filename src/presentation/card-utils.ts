export function reverseKey(cardId: string): string {
  return `${cardId}::reverse`
}

/** Coarse rarity family used both by the on-screen symbol and by the Excel export. */
export function rarityKind(rarity?: string): string {
  const value = rarity?.toLowerCase() ?? ''
  if (value.includes('ace spec')) return 'ace-spec'
  if (value.includes('hyper')) return 'hyper'
  if (value.includes('special illustration') || value.includes('secret')) return 'secret-art'
  if (value.includes('illustration')) return 'illustration'
  if (value.includes('ultra')) return 'ultra'
  if (value.includes('double') || value.includes('ex')) return 'double'
  if (value.includes('uncommon')) return 'uncommon'
  if (value.includes('common')) return 'common'
  return 'rare'
}

/** Star count of the printed symbol, shared by the on-screen badge and the Excel export. */
export function rarityStars(kind: string): number {
  if (kind === 'hyper') return 3
  if (kind === 'double' || kind === 'ultra' || kind === 'secret-art') return 2
  return 1
}

export type RarityPrint = { symbol: string; color: string; outline: boolean }

/**
 * Rarity symbol as it should be printed in the spreadsheet: the regular rarities use black ink,
 * exactly like the symbol stamped on the card, while the special rarities keep the colours designed
 * for the on-screen badge and are outlined in black so they stay readable on a white sheet.
 */
export function rarityPrint(rarity?: string): RarityPrint {
  if (!rarity) return { symbol: '—', color: '#6b6b70', outline: false }

  const kind = rarityKind(rarity)
  if (kind === 'common') return { symbol: '●', color: '#000000', outline: false }
  if (kind === 'uncommon') return { symbol: '◆', color: '#000000', outline: false }
  if (kind === 'rare') return { symbol: '★', color: '#000000', outline: false }

  const colors: Record<string, string> = {
    'ace-spec': '#f05bba',
    'illustration': '#f2ca63',
    'secret-art': '#f2ca63',
    'hyper': '#f2ca63',
    'ultra': '#d9dce5',
    'double': '#ffffff',
  }
  return { symbol: '★'.repeat(rarityStars(kind)), color: colors[kind] ?? '#d9dce5', outline: true }
}

export function formatCardNumber(localId: string, total: number): string {
  const number = /^\d+$/.test(localId) ? localId.padStart(3, '0') : localId
  return `${number}/${total}`
}

export function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
