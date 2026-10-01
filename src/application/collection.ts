import type { CardBrief, CardFilter, CardSet, Ownership } from '../domain/models'
import { setTotalsFor, type SetTotals } from './setTotals'

export function sortCards(cards: CardBrief[]): CardBrief[] {
  return [...cards].sort((a, b) => a.localId.localeCompare(b.localId, undefined, { numeric: true, sensitivity: 'base' }))
}

export function filterCards(cards: CardBrief[], ownership: Ownership, filter: CardFilter): CardBrief[] {
  return sortCards(cards).filter(card => filter === 'all' || (filter === 'owned' ? (ownership[card.id] ?? 0) > 0 : !(ownership[card.id] > 0)))
}

export function setProgress(set: CardSet, ownership: Ownership, totals?: SetTotals): { owned: number; total: number; percent: number } {
  const owned = set.cards
    ? set.cards.reduce((count, card) => count + ((ownership[card.id] ?? 0) > 0 ? 1 : 0) + ((ownership[`${card.id}::reverse`] ?? 0) > 0 ? 1 : 0), 0)
    : Object.entries(ownership).filter(([id, count]) => id.startsWith(`${set.id}-`) && count > 0).length
  const known = totals ?? setTotalsFor(set)
  const total = known.total + known.reverse
  return { owned, total, percent: total ? Math.min(100, Math.round(owned / total * 100)) : 0 }
}
