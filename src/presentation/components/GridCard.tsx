import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CardBrief, CardDetails } from '../../domain/models'
import { formatCardNumber } from '../card-utils'
import { RaritySymbol } from './RaritySymbol'
import { ReverseHoloShine } from './ReverseHoloShine'

type Props = { card: CardBrief; total: number; reverse: boolean; owned: boolean; details?: CardDetails; onToggle: () => void }
type Preview = { left: number; top: number; isVisible: boolean }

export function GridCard({ card, total, reverse, owned, details, onToggle }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [preview, setPreview] = useState<Preview | null>(null)
  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(dismissTimer.current) }, [])
  const cancelPreview = () => {
    window.clearTimeout(timer.current)
    setPreview(current => current ? { ...current, isVisible: false } : null)
    window.clearTimeout(dismissTimer.current)
    dismissTimer.current = window.setTimeout(() => setPreview(null), 160)
  }
  const startPreview = (element: HTMLButtonElement) => {
    window.clearTimeout(timer.current)
    window.clearTimeout(dismissTimer.current)
    timer.current = window.setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const width = 230
      setPreview({ left: Math.max(8, rect.left - width - 12), top: Math.max(8, Math.min(rect.top, window.innerHeight - 330)), isVisible: true })
    }, 1000)
  }
  return <>
    <button data-card-key={`${card.id}:${reverse ? 'reverse' : 'normal'}`} className={`card-tile ${owned ? 'is-owned' : 'is-needed'} ${reverse ? 'is-reverse-holo' : ''}`} onClick={onToggle} onMouseEnter={event => startPreview(event.currentTarget)} onMouseLeave={cancelPreview} onFocus={event => startPreview(event.currentTarget)} onBlur={cancelPreview} aria-label={`${card.name}${reverse ? ', Reverse Holo' : ''}, ${formatCardNumber(card.localId, total)}, ${owned ? 'owned' : 'needed'}`} aria-pressed={owned}>
      <img className="card-art-image" src={card.image ? `${card.image}/high.png` : ''} alt="" loading="lazy" onError={event => event.currentTarget.classList.add('image-missing')}/>
      {reverse && <ReverseHoloShine/>}
      {reverse && <span className="card-variant-badge" aria-hidden="true">Reverse Holo</span>}
      <span className="card-index">{formatCardNumber(card.localId, total)}</span>
      <span className="rarity-badge"><RaritySymbol rarity={details?.rarity}/></span>
      <span className={`card-owned-check ${owned ? 'checked' : ''}`} aria-hidden="true">{owned ? '✓' : ''}</span>
    </button>
    {preview && createPortal(<div className={`card-hover-preview ${preview.isVisible ? 'is-visible' : ''}`} style={{ left: preview.left, top: preview.top }} aria-hidden="true"><img src={card.image ? `${card.image}/high.png` : ''} alt=""/><span>{card.name}{reverse ? ' — Reverse Holo' : ''}</span><small>{formatCardNumber(card.localId, total)}</small></div>, document.body)}
  </>
}
