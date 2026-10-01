import { rarityKind, rarityStars } from '../card-utils'

function rarityLabel(rarity?: string): string {
  return rarity ?? 'Unknown rarity'
}

export function RaritySymbol({ rarity }: { rarity?: string }) {
  const kind = rarityKind(rarity)
  const stars = rarityStars(kind)
  if (kind === 'common') return <span className="rarity-symbol common" title={rarityLabel(rarity)} aria-label={rarityLabel(rarity)}>●</span>
  if (kind === 'uncommon') return <span className="rarity-symbol uncommon" title={rarityLabel(rarity)} aria-label={rarityLabel(rarity)}>◆</span>
  return <span className={`rarity-symbol ${kind}`} title={rarityLabel(rarity)} aria-label={rarityLabel(rarity)}>{Array.from({ length: stars }, (_, index) => <span key={index}>★</span>)}</span>
}
