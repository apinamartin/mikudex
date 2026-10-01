import { useEffect, useRef } from 'react'
import type { CardBrief, CardDetails } from '../../domain/models'
import { GridCard } from './GridCard'

export type BinderEntry = { card: CardBrief; reverse: boolean }
export type BinderPageSize = 9 | 12

type Props = {
  cards: BinderEntry[]
  details: Record<string, CardDetails>
  total: number
  pageSize: BinderPageSize
  page: number
  pageCount: number
  setName: string
  isOwned: (entry: BinderEntry) => boolean
  onToggle: (entry: BinderEntry) => void
  onPageChange: (page: number) => void
}

export function BinderPage({ cards, details, total, pageSize, page, pageCount, setName, isOwned, onToggle, onPageChange }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const lastPage = useRef(page)
  const mounted = useRef(false)
  const columns = pageSize === 12 ? 4 : 3
  const entries = cards.slice(page * pageSize, page * pageSize + pageSize)
  const emptyPockets = pageSize - entries.length

  useEffect(() => {
    const previous = lastPage.current
    lastPage.current = page
    if (!mounted.current) { mounted.current = true; return }
    if (previous === page) return
    sheetRef.current?.animate(
      [
        { opacity: 0, transform: 'perspective(1500px) rotateY(6deg)' },
        { opacity: 1, transform: 'perspective(1500px) rotateY(0deg)' },
      ],
      { duration: 240, easing: 'cubic-bezier(.2,.75,.25,1)' },
    )
  }, [page])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); onPageChange(page - 1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); onPageChange(page + 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPageChange, page])

  return (
    <div className="binder-view card-view-enter">
      <div className="binder-shell">
        <div className="binder-spine" aria-hidden="true">
          <span className="binder-ring" /><span className="binder-ring" /><span className="binder-ring" />
        </div>

        <div className="binder-scroll">
          <div className="binder-sheet" ref={sheetRef}>
            <div className="binder-sheet-body">
              <div className={`binder-pocket-grid cols-${columns}`}>
                {entries.map(entry => (
                  <div className="binder-pocket" key={`${entry.card.id}:${entry.reverse ? 'reverse' : 'normal'}`}>
                    <GridCard
                      card={entry.card}
                      total={total}
                      reverse={entry.reverse}
                      details={details[entry.card.id]}
                      owned={isOwned(entry)}
                      onToggle={() => onToggle(entry)}
                    />
                  </div>
                ))}
                {Array.from({ length: emptyPockets }, (_, index) => (
                  <div className="binder-pocket is-empty" key={`empty-${index}`} aria-hidden="true" />
                ))}
              </div>
            </div>

            <footer className="binder-sheet-footer">
              <span className="binder-sheet-set">{setName}</span>
              <span className="binder-sheet-count">{cards.length} cards</span>
              <span className="binder-sheet-page">Page {page + 1} / {pageCount}</span>
            </footer>
          </div>
        </div>
      </div>

      <div className="binder-pager">
        <button className="binder-pager-button" onClick={() => onPageChange(page - 1)} disabled={page <= 0} aria-label="Previous binder page">‹ Previous</button>
        {pageCount <= 30
          ? <div className="binder-pager-dots" aria-hidden="true">
            {Array.from({ length: pageCount }, (_, index) => (
              <button key={index} className={`binder-dot ${index === page ? 'active' : ''}`} onClick={() => onPageChange(index)} tabIndex={-1} aria-label={`Go to page ${index + 1}`} />
            ))}
          </div>
          : <span className="binder-pager-label" aria-live="polite">Page {page + 1} of {pageCount}</span>}
        <button className="binder-pager-button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount - 1} aria-label="Next binder page">Next ›</button>
      </div>
    </div>
  )
}
