import type { CardDetails, CardFilter, CardSet, ExportPort, Ownership } from '../../domain/models'
import { sortCards } from '../../application/collection'
import { rarityPrint, reverseKey, type RarityPrint } from '../../presentation/card-utils'

type ExportCard = { id: string; localId: string; name: string; image?: string; reverse: boolean }

function html(value: unknown): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function priceLabel(details?: CardDetails): string {
  const eur = details?.pricing?.cardmarket?.avg
  if (eur != null) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: details?.pricing?.cardmarket?.unit || 'EUR',
    }).format(eur)
  }

  const usd = details?.pricing?.tcgplayer?.normal?.marketPrice
  if (usd != null) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: details?.pricing?.tcgplayer?.unit || 'USD',
    }).format(usd)
  }

  return '—'
}

function rarityInk(rarity: RarityPrint): string {
  const outline = 'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 -1px 0 #000,0 1px 0 #000,-1px 0 0 #000,1px 0 0 #000'
  return [`color:${rarity.color}`, rarity.outline ? outline : ''].filter(Boolean).join(';')
}

export class ExcelXmlExporter implements ExportPort {
  exportSet(set: CardSet, ownership: Ownership, filter: CardFilter, details: Record<string, CardDetails> = {}, showReverseHolos = true): void {
    const cards = sortCards(set.cards ?? []).flatMap(card => [
      { ...card, reverse: false },
      ...(showReverseHolos && details[card.id]?.variants?.reverse ? [{ ...card, reverse: true }] : []),
    ]).filter((card: ExportCard) => {
      const owned = (ownership[card.reverse ? reverseKey(card.id) : card.id] ?? 0) > 0
      return filter === 'all' || (filter === 'owned' ? owned : !owned)
    }) as ExportCard[]
    const ownedCount = cards.filter(card => (ownership[card.reverse ? reverseKey(card.id) : card.id] ?? 0) > 0).length
    const rows = cards.map(card => {
      const quantity = ownership[card.reverse ? reverseKey(card.id) : card.id] ?? 0
      const rarity = rarityPrint(details[card.id]?.rarity)
      return `<tr><td class="number">${html(card.localId)}</td><td class="name">${html(card.name)}</td><td class="rarity" style="${rarityInk(rarity)}" title="${html(details[card.id]?.rarity ?? 'Unknown rarity')}${card.reverse ? ' · Reverse Holo' : ''}">${html(rarity.symbol)}${card.reverse ? '<span class="rh">RH</span>' : ''}</td><td class="price">${html(priceLabel(details[card.id]))}</td><td class="check">${quantity ? '☑' : '☐'}</td></tr>`
    }).join('')
    const workbook = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /><style>
      body { background: #ffffff; color: #1d1e23; font-family: Arial, sans-serif; } table { border-collapse: collapse; width: 100%; background: #ffffff; }
      caption { background: #131417; color: #f6f4f2; font-size: 20pt; font-weight: bold; letter-spacing: 1px; padding: 18px; text-align: left; } th { background: #392128; border-bottom: 2px solid #e75067; color: #fff; font-size: 10pt; padding: 9px; text-align: left; }
      td { border-bottom: 1px solid #d8d8dc; color: #24252a; padding: 7px 9px; vertical-align: middle; } tr:nth-child(even) td { background: #f7f7f8; }
      .number { width: 55px; color: #b43650; } .name { font-weight: bold; min-width: 200px; } .rarity { width: 74px; text-align: center; font-size: 11pt; font-weight: bold; letter-spacing: 1px; } .rh { color: #24252a; text-shadow: none; font-size: 9pt; letter-spacing: 0; margin-left: 4px; } .price { width: 90px; text-align: right; } .check { width: 55px; color: #b43650; font-size: 16pt; text-align: center; } .summary { background: #ffffff; color: #55565d; font-size: 10pt; padding: 10px 18px; }
    </style></head><body><table><caption>MIKU<span style="color:#e75067">DEX</span> · ${html(set.name)}</caption><tr><td class="summary" colspan="5">${ownedCount} of ${cards.length} cards owned · Export: ${html(filter)} · Reverse holos ${showReverseHolos ? 'included' : 'hidden'} · Rarity: ● common · ◆ uncommon · ★ rare in black ink, special rarities in their card colour outlined in black · ★ count matches the card · RH = reverse holo</td></tr><tr><th>No.</th><th>Card name</th><th>Rarity</th><th>Market price</th><th>Owned</th></tr>${rows}</table></body></html>`
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${set.name.replace(/[<>:"/\\|?*]/g, '-')} - ${filter}.xls`
    link.click()
    URL.revokeObjectURL(url)
  }
}
