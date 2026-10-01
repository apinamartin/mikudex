import { useMemo, useState } from 'react'
import type { CardBrief, CardDetails } from '../../domain/models'
import { rarityKind } from '../card-utils'
import { RaritySymbol } from './RaritySymbol'

type DisplayCard = { card: CardBrief; reverse: boolean }
type Props = { cards: DisplayCard[]; details: Record<string, CardDetails>; isOwned: (card: DisplayCard) => boolean }

const REVERSE_HOLO = 'Reverse Holo'
const UNKNOWN = 'Missing card details'

/** The order the rarities are listed in: common first, hyper rare last, right before the reverse holos. */
const RARITY_LADDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  'double': 3,
  'ace-spec': 4,
  'illustration': 5,
  'ultra': 6,
  'secret-art': 7,
  'hyper': 8,
}

/** Where a category belongs in the table: printed rarities by ladder, then reverse holos, then unknowns. */
function rarityOrder(rarity: string): number {
  if (rarity === UNKNOWN) return Number.MAX_SAFE_INTEGER
  if (rarity === REVERSE_HOLO) return Number.MAX_SAFE_INTEGER - 1_000
  return RARITY_LADDER[rarityKind(rarity)] ?? 500
}

type Row = { rarity: string; reverse: boolean; total: number; owned: number }

export function RarityBreakdown({ cards, details, isOwned }: Props) {
  const [expanded, setExpanded] = useState(false)
  const rows = useMemo(() => {
    const grouped = new Map<string, Row>()
    cards.forEach(entry => {
      // A reverse holo is its own category: it never joins the row of the card it mirrors.
      const rarity = entry.reverse ? REVERSE_HOLO : (details[entry.card.id]?.rarity ?? UNKNOWN)
      const row = grouped.get(rarity) ?? { rarity, reverse: entry.reverse, total: 0, owned: 0 }
      row.total += 1
      row.owned += isOwned(entry) ? 1 : 0
      grouped.set(rarity, row)
    })
    return [...grouped.values()].sort((left, right) =>
      rarityOrder(left.rarity) - rarityOrder(right.rarity) || left.rarity.localeCompare(right.rarity))
  }, [cards, details, isOwned])

  return <div className="rarity-breakdown">
    <button className="rarity-breakdown-toggle" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
      <span>Missing card details</span>
      <span className={`filters-toggle-arrow ${expanded ? 'expanded' : ''}`} aria-hidden="true" />
    </button>
    {expanded && <div className="rarity-breakdown-list">
      {rows.map(row => {
        const missing = row.total - row.owned
        const percent = row.total ? Math.round(row.owned / row.total * 100) : 0
        return <div className={`rarity-breakdown-row${row.reverse ? ' is-reverse' : ''}`} key={row.rarity}>
          <span className="rarity-breakdown-symbol">
            {row.reverse
              ? <span className="rarity-symbol reverse-holo" title={REVERSE_HOLO} aria-label={REVERSE_HOLO}>✦</span>
              : row.rarity === UNKNOWN
                ? <span className="rarity-symbol unknown" title={UNKNOWN} aria-label={UNKNOWN}>—</span>
                : <RaritySymbol rarity={row.rarity} />}
          </span>
          <strong>{row.rarity}</strong>
          <small>{row.total} cards</small>
          <span className="rarity-breakdown-counts">{row.owned} owned · {missing} missing · {percent}%</span>
          <i><b style={{ width: `${percent}%` }}/></i>
        </div>
      })}
    </div>}
  </div>
}

