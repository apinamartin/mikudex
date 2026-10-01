import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CardBrief, CardDetails } from '../../domain/models'
import { TcgdexCatalog } from '../../adapters/tcgdex/TcgdexCatalog'
import { formatCardNumber } from '../card-utils'
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
type Preview = { left: number; top: number; isVisible: boolean }

export function DetailedCardRow({ card, total, reverse, owned, details: suppliedDetails, onToggle }: Props) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [preview, setPreview] = useState<Preview | null>(null)
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
  useEffect(() => () => { window.clearTimeout(previewTimer.current); window.clearTimeout(dismissTimer.current) }, [])
  const cancelPreview = () => {
    window.clearTimeout(previewTimer.current)
    setPreview(current => current ? { ...current, isVisible: false } : null)
    window.clearTimeout(dismissTimer.current)
    dismissTimer.current = window.setTimeout(() => setPreview(null), 160)
  }
  const startPreview = (element: HTMLButtonElement) => {
    window.clearTimeout(previewTimer.current)
    window.clearTimeout(dismissTimer.current)
    previewTimer.current = window.setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const width = 230
      setPreview({ left: Math.max(8, rect.left - width - 12), top: Math.max(8, Math.min(rect.top, window.innerHeight - 330)), isVisible: true })
    }, 700)
  }
  return <>
  <div data-card-key={`${card.id}:${reverse ? 'reverse' : 'normal'}`} className={`detail-card-row ${owned ? 'is-owned' : 'is-needed'} ${reverse ? 'is-reverse-holo' : ''}`}>
    <button ref={rowRef} className="detail-card-main" onClick={onToggle} onMouseEnter={event => startPreview(event.currentTarget)} onMouseLeave={cancelPreview} onFocus={event => startPreview(event.currentTarget)} onBlur={cancelPreview} aria-pressed={owned}>
      <span className="detail-check" aria-hidden="true">{owned ? '✓' : ''}</span>
      <img src={card.image ? `${card.image}/low.png` : ''} alt="" loading="lazy"/>
      {reverse && <ReverseHoloShine/>}
      <span className="detail-primary"><strong>{card.name}</strong><small>{reverse ? 'Reverse Holo · ' : ''}{details?.rarity ?? 'Unknown rarity'}</small></span>
      <span className="detail-number"><small>CARD NUMBER</small><strong>{formatCardNumber(card.localId, total)}</strong></span>
      <span className="detail-price"><small>MARKET PRICE</small><strong>{loadingPrice ? 'Loading…' : priceLabel(details)}</strong></span>
    </button>
  </div>
  {preview && createPortal(<div className={`card-hover-preview ${preview.isVisible ? 'is-visible' : ''}`} style={{ left: preview.left, top: preview.top }} aria-hidden="true"><img src={card.image ? `${card.image}/high.png` : ''} alt=""/><span>{card.name}{reverse ? ' — Reverse Holo' : ''}</span><small>{formatCardNumber(card.localId, total)}</small></div>, document.body)}
  </>
}
