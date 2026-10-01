import type { CardBrief, CardDetails } from '../../domain/models'
import { formatCardNumber } from '../card-utils'
import { RaritySymbol } from './RaritySymbol'
import { ReverseHoloShine } from './ReverseHoloShine'

type Props = { card: CardBrief; total: number; reverse: boolean; owned: boolean; details?: CardDetails; onToggle: () => void }

export function GridCard({ card, total, reverse, owned, details, onToggle }: Props) {
  return (
    <button data-card-key={`${card.id}:${reverse ? 'reverse' : 'normal'}`} className={`card-tile ${owned ? 'is-owned' : 'is-needed'} ${reverse ? 'is-reverse-holo' : ''}`} onClick={onToggle} aria-label={`${card.name}${reverse ? ', Reverse Holo' : ''}, ${formatCardNumber(card.localId, total)}, ${owned ? 'owned' : 'needed'}`} aria-pressed={owned}>
      <img className="card-art-image" src={card.image ? `${card.image}/high.png` : ''} alt="" loading="lazy" onError={event => event.currentTarget.classList.add('image-missing')}/>
      {reverse && <ReverseHoloShine/>}
      {reverse && <span className="card-variant-badge" aria-hidden="true">Reverse Holo</span>}
      <span className="card-index">{formatCardNumber(card.localId, total)}</span>
      <span className="rarity-badge"><RaritySymbol rarity={details?.rarity}/></span>
      <span className={`card-owned-check ${owned ? 'checked' : ''}`} aria-hidden="true">{owned ? '✓' : ''}</span>
    </button>
  )
}
