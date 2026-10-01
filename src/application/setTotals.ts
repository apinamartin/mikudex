import type { CardSet } from '../domain/models'
import { generatedSetTotals, type SetTotals } from '../adapters/tcgdex/generatedSetTotals'

export type { SetTotals }

const STORAGE_KEY = 'mikudex.set-totals'

let measuredCache: Record<string, SetTotals> | null = null

function measuredTotals(): Record<string, SetTotals> {
  if (measuredCache) return measuredCache
  try {
    measuredCache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, SetTotals>
  } catch {
    measuredCache = {}
  }
  return measuredCache
}

/** True when neither the synced snapshot nor a local measurement knows this set. */
export function isUnknownSet(setId: string): boolean {
  return !(measuredTotals()[setId] ?? generatedSetTotals[setId])
}

/**
 * Store counters measured card by card in the set view. They win over the shipped snapshot so a
 * catalog update upstream is reflected on the home page as soon as the set is opened again.
 */
export function recordSetTotals(setId: string, totals: SetTotals): void {
  const measured = measuredTotals()
  const previous = measured[setId]
  if (previous?.total === totals.total && previous?.reverse === totals.reverse) return

  measured[setId] = totals
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(measured))
  } catch {
    // Storage full or unavailable: the counters of this session still live in memory.
  }
}

/**
 * Cards of a set and how many of them have a reverse holo print, without any extra request.
 * Priority: card level measurement made in the set view, then the snapshot shipped with the app,
 * and finally the coarse counters TCGdex returns for a series (which never list reverse holos).
 */
export function setTotalsFor(set: CardSet, provisional: Record<string, SetTotals> = {}): SetTotals {
  const known = provisional[set.id] ?? measuredTotals()[set.id] ?? generatedSetTotals[set.id]
  if (known) return known
  return {
    total: set.cardCount?.total ?? set.cards?.length ?? 0,
    reverse: set.cardCount?.reverse ?? 0,
  }
}

/** Full checklist size of a set: every card plus every reverse holo print. */
export function setTotalCount(set: CardSet, provisional: Record<string, SetTotals> = {}): number {
  const totals = setTotalsFor(set, provisional)
  return totals.total + totals.reverse
}
