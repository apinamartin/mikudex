import { useEffect, useRef, useState } from 'react'
import type { CardBrief, CardDetails } from '../../domain/models'
import { TcgdexCatalog } from '../../adapters/tcgdex/TcgdexCatalog'
import { formatCardNumber } from '../card-utils'
import { RaritySymbol } from './RaritySymbol'
import { ReverseHoloShine } from './ReverseHoloShine'

const catalog = new TcgdexCatalog()
const cache = new Map<string, CardDetails>()

function priceLabel(details?: CardDetails): string {
  const eur = details?.pricing?.cardmarket?.avg
  if (eur != null) return new Intl.NumberFormat('en-GB', { style: 'currency', currency: details?.pricing?.cardmarket?.unit || 'EUR' }).format(eur)
  const usd = details?.pricing?.tcgplayer?.normal?.marketPrice
  if (usd != null) return new Intl.NumberFormat('en-US', { style: 'currency', currency: details?.pricing?.tcgplayer?.unit || 'USD' }).format(usd)
  return 'Price unavailable'
}

type Props = { card: CardBrief; total: number; reverse: boolean; owned: boolean; details?: CardDetails; onToggle: () => void }

export function DetailedCardRow({ card, total, reverse, owned, details: suppliedDetails, onToggle }: Props) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const [details, setDetails] = useState<CardDetails | undefined>(() => suppliedDetails ?? cache.get(card.id))
  const [loadingPrice, setLoadingPrice] = useState(false)
  useEffect(() => {
    if (!rowRef.current || suppliedDetails || details || loadingPrice) return
    const load = () => { setLoadingPrice(true); void catalog.getCard(card.id).then(value => { cache.set(card.id, value); setDetails(value) }).catch(() => undefined).finally(() => setLoadingPrice(false)) }
    if (!('IntersectionObserver' in window)) { load(); return }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load() } }, { rootMargin: '300px' })
    observer.observe(rowRef.current)
    return () => observer.disconnect()
  }, [card.id, details, loadingPrice, suppliedDetails])
  return (
  <div data-card-key={`${card.id}:${reverse ? 'reverse' : 'normal'}`} className={`detail-card-row ${owned ? 'is-owned' : 'is-needed'} ${reverse ? 'is-reverse-holo' : ''}`}>
    <button ref={rowRef} className="detail-card-main" onClick={onToggle} aria-pressed={owned}>
      <span className="detail-check" aria-hidden="true">{owned ? '✓' : ''}</span>
      <img src={card.image ? `${card.image}/low.png` : ''} alt="" loading="lazy"/>
      {reverse && <ReverseHoloShine/>}
      <span className="detail-primary">
        <strong>{card.name}</strong>
        <span className="detail-rarity">
          {reverse
            ? <span className="rarity-symbol reverse-holo" title="Reverse Holo" aria-label="Reverse Holo">✦</span>
            : <RaritySymbol rarity={details?.rarity} />}
          <small>{reverse ? 'Reverse Holo · ' : ''}{details?.rarity ?? 'Unknown rarity'}</small>
        </span>
      </span>
      <span className="detail-number"><small>CARD NUMBER</small><strong>{formatCardNumber(card.localId, total)}</strong></span>
      <span className="detail-price"><small>MARKET PRICE</small><strong>{loadingPrice ? 'Loading…' : priceLabel(details)}</strong></span>
    </button>
  </div>
  )
}
