import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CardBrief, CardDetails, CardFilter, CardSet, Ownership } from '../../domain/models'
import { filterCards } from '../../application/collection'
import { recordSetTotals, setTotalCount } from '../../application/setTotals'
import { TcgdexCatalog } from '../../adapters/tcgdex/TcgdexCatalog'
import { ExcelXmlExporter } from '../../adapters/export/ExcelXmlExporter'
import { reverseKey } from '../card-utils'
import { BinderPage } from './BinderPage'
import type { BinderPageSize } from './BinderPage'
import { DetailedCardRow } from './DetailedCardRow'
import { GridCard } from './GridCard'
import { Logo } from './Logo'
import { RarityBreakdown } from './RarityBreakdown'

const catalog = new TcgdexCatalog()
const exporter = new ExcelXmlExporter()
const cardDetailsCache = new Map<string, CardDetails>()
const filters: { id: CardFilter; label: string }[] = [
  { id: 'all', label: 'All cards' },
  { id: 'owned', label: 'Owned' },
  { id: 'need', label: 'Needed' },
]

type DisplayCard = { card: CardBrief; reverse: boolean }

type CardLayout = 'grid' | 'details' | 'binder'

function readLayout(saved: string | null): CardLayout {
  return saved === 'details' || saved === 'binder' ? saved : 'grid'
}

function readPageSize(saved: string | null): BinderPageSize {
  const size = Number(saved)
  // 16 was an earlier 4 x 4 page; it maps onto today's 3 x 4 page.
  return size === 12 || size === 16 ? 12 : 9
}

type GridColumnProfile = 'compact' | 'mobile' | 'tablet' | 'desktop'

function gridColumnProfile(width: number): GridColumnProfile {
  if (width <= 420) return 'compact'
  if (width <= 600) return 'mobile'
  if (width <= 1000) return 'tablet'
  return 'desktop'
}

function defaultGridColumns(profile: GridColumnProfile): number {
  if (profile === 'compact') return 3
  if (profile === 'mobile') return 4
  if (profile === 'tablet') return 6
  return 8
}

function maxGridColumns(profile: GridColumnProfile): number {
  if (profile === 'compact') return 3
  if (profile === 'mobile') return 4
  if (profile === 'tablet') return 6
  return 8
}

function readGridColumns(width: number): number {
  const profile = gridColumnProfile(width)
  const key = `mikudex.grid-columns.${profile}`
  const saved = localStorage.getItem(key) ?? (profile === 'desktop' ? localStorage.getItem('mikudex.grid-columns') : null)
  const columns = Number(saved)
  return Number.isInteger(columns) && columns >= 2
    ? Math.min(columns, maxGridColumns(profile))
    : defaultGridColumns(profile)
}

type Props = {
  cardSet: CardSet
  ownership: Ownership
  onToggleOwnership: (id: string) => void
  onSetOwnership: (ids: string[], owned: boolean) => void
}

async function loadSetDetails(cards: CardBrief[]): Promise<Record<string, CardDetails>> {
  const cacheKey = `mikudex.set-details.${cards[0].id.split('-')[0]}`
  const stored = localStorage.getItem(cacheKey)

  if (stored) {
    try {
      const details = JSON.parse(stored) as CardDetails[]
      if (details.length === cards.length) return Object.fromEntries(details.map(card => [card.id, card]))
    } catch {
      // Refresh an invalid cache from TCGdex.
    }
  }

  const results: CardDetails[] = []
  const queue = [...cards]

  async function worker() {
    while (queue.length) {
      const card = queue.shift()
      if (!card) return

      const detail = cardDetailsCache.get(card.id) ?? await catalog.getCard(card.id)
      cardDetailsCache.set(card.id, detail)
      results.push(detail)
    }
  }

  await Promise.all(Array.from({ length: Math.min(6, cards.length) }, () => worker()))
  localStorage.setItem(cacheKey, JSON.stringify(results))
  return Object.fromEntries(results.map(card => [card.id, card]))
}

export function SetPage({ cardSet, ownership, onToggleOwnership, onSetOwnership }: Props) {
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const filterPositionsRef = useRef<Map<string, DOMRect> | null>(null)
  const [filter, setFilter] = useState<CardFilter>('all')
  const [showReverseHolos, setShowReverseHolos] = useState(() => localStorage.getItem('mikudex.show-reverse-holos') !== 'false')
  const [details, setDetails] = useState<Record<string, CardDetails>>({})
  const [columnProfile, setColumnProfile] = useState(() => gridColumnProfile(window.innerWidth))
  const [columns, setColumns] = useState(() => readGridColumns(window.innerWidth))
  const [layout, setLayout] = useState<CardLayout>(() => readLayout(localStorage.getItem('mikudex.card-layout')))
  const [pageSize, setPageSize] = useState<BinderPageSize>(() => readPageSize(localStorage.getItem('mikudex.binder-page-size')))
  const [page, setPage] = useState(0)
  const [loadingDetails, setLoadingDetails] = useState(() => Boolean(cardSet.cards?.length))
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  useEffect(() => {
    localStorage.setItem(`mikudex.grid-columns.${columnProfile}`, String(columns))
  }, [columnProfile, columns])

  useEffect(() => {
    const syncGridColumns = () => {
      const profile = gridColumnProfile(window.innerWidth)
      setColumnProfile(profile)
      setColumns(readGridColumns(window.innerWidth))
    }

    window.addEventListener('resize', syncGridColumns)
    return () => window.removeEventListener('resize', syncGridColumns)
  }, [])

  useEffect(() => {
    localStorage.setItem('mikudex.card-layout', layout)
  }, [layout])

  useEffect(() => {
    localStorage.setItem('mikudex.binder-page-size', String(pageSize))
  }, [pageSize])

  useEffect(() => {
    localStorage.setItem('mikudex.show-reverse-holos', String(showReverseHolos))
  }, [showReverseHolos])

  useEffect(() => {
    const cards = cardSet.cards ?? []
    if (!cards.length) return

    let current = true
    void loadSetDetails(cards)
      .then(nextDetails => {
        if (!current) return
        setDetails(nextDetails)
        // Card level truth: keeps the home page counters in step with what this set really prints.
        if (Object.keys(nextDetails).length === cards.length) {
          recordSetTotals(cardSet.id, {
            total: cards.length,
            reverse: Object.values(nextDetails).filter(card => card.variants?.reverse).length,
          })
        }
      })
      .catch(() => {
        if (current) setError('Some card variant information could not be loaded.')
      })
      .finally(() => {
        if (current) setLoadingDetails(false)
      })

    return () => {
      current = false
    }
  }, [cardSet.id, cardSet.cards])

  // The binder keeps the checklist plain: every card, owned or needed, with only reverse holos as an option.
  const withReverseHolos = showReverseHolos

  const displayCards = useMemo<DisplayCard[]>(() => {
    const cards = filterCards(cardSet.cards ?? [], ownership, 'all')
    return cards.flatMap(card => [
      { card, reverse: false },
      ...(withReverseHolos && details[card.id]?.variants?.reverse ? [{ card, reverse: true }] : []),
    ])
  }, [cardSet.cards, details, ownership, withReverseHolos])

  const setOwnershipKeys = useMemo(() => (cardSet.cards ?? []).flatMap(card => {
    const reverseId = reverseKey(card.id)
    return [card.id, ...(details[card.id]?.variants?.reverse || ownership[reverseId] ? [reverseId] : [])]
  }), [cardSet.cards, details, ownership])

  const visibleCards = useMemo(() => {
    const term = search.trim().toLowerCase()
    return displayCards.filter(({ card, reverse }) => {
      const owned = (ownership[reverse ? reverseKey(card.id) : card.id] ?? 0) > 0
      const matchesFilter = filter === 'all' || (filter === 'owned' ? owned : !owned)
      const matchesSearch = !term || card.name.toLowerCase().includes(term) || card.localId.toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [displayCards, filter, ownership, search])

  // Binder pages walk the whole checklist, so only the search box narrows it down.
  const binderCards = useMemo(() => {
    const term = search.trim().toLowerCase()
    return displayCards.filter(({ card }) => !term || card.name.toLowerCase().includes(term) || card.localId.toLowerCase().includes(term))
  }, [displayCards, search])

  const pageCount = Math.max(1, Math.ceil(binderCards.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const pageCards = binderCards.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
  const noCardsToShow = layout === 'binder' ? binderCards.length === 0 : visibleCards.length === 0

  const ownedCount = displayCards.filter(({ card, reverse }) => (ownership[reverse ? reverseKey(card.id) : card.id] ?? 0) > 0).length
  // Until the variants arrive, the synced counters already know the real size of the checklist.
  const totalCount = loadingDetails ? setTotalCount(cardSet) : displayCards.length
  const neededCount = totalCount - ownedCount
  const progress = {
    owned: ownedCount,
    total: totalCount,
    percent: totalCount ? Math.min(100, Math.round(ownedCount / totalCount * 100)) : 0,
  }

  useLayoutEffect(() => {
    const previousPositions = filterPositionsRef.current
    const container = cardContainerRef.current
    filterPositionsRef.current = null
    if (!previousPositions || !container) return

    container.querySelectorAll<HTMLElement>('[data-card-key]').forEach(element => {
      const oldPosition = previousPositions.get(element.dataset.cardKey ?? '')

      if (!oldPosition) {
        element.animate(
          [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 180, easing: 'ease-out' },
        )
        return
      }

      const currentPosition = element.getBoundingClientRect()
      const x = oldPosition.left - currentPosition.left
      const y = oldPosition.top - currentPosition.top
      if (x || y) {
        element.animate(
          [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
          { duration: 260, easing: 'cubic-bezier(.2,.75,.25,1)' },
        )
      }
    })
  }, [filter])

  function changeFilter(nextFilter: CardFilter) {
    if (nextFilter === filter) return

    const container = cardContainerRef.current
    filterPositionsRef.current = container
      ? new Map([...container.querySelectorAll<HTMLElement>('[data-card-key]')].map(element => [element.dataset.cardKey ?? '', element.getBoundingClientRect()]))
      : null
    setFilter(nextFilter)
  }

  function changeLayout(nextLayout: CardLayout) {
    if (nextLayout === layout) return
    // The binder is a full-checklist view: the owned / needed narrowing never carries over into it.
    if (nextLayout === 'binder') setFilter('all')
    setLayout(nextLayout)
  }

  function changePageSize(nextSize: BinderPageSize) {
    if (nextSize === pageSize) return
    setPageSize(nextSize)
    setPage(0)
  }

  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.max(0, Math.min(nextPage, pageCount - 1)))
  }, [pageCount])

  function isOwned(displayCard: DisplayCard): boolean {
    const key = displayCard.reverse ? reverseKey(displayCard.card.id) : displayCard.card.id
    return (ownership[key] ?? 0) > 0
  }

  return (
    <section className="set-page">
      <div className="set-sticky-header" role="region" aria-label={`${cardSet.name} collection controls`}>
        <a className="back-link" href="/">← <span>All collections</span></a>

        <div className="set-heading">
          <div className="set-title-group">
            <Logo src={cardSet.logo} fallbackSrc={cardSet.symbol} alt={`${cardSet.name} logo`} className="set-title-logo" />
            <div>
              <div className="kicker">{cardSet.releaseDate ?? 'POKÉMON TCG SET'}</div>
              <h1>{cardSet.name}</h1>
              <p>
                {progress.owned} / {progress.total} cards
                <span className="set-percent" title={`${progress.owned} of ${progress.total} cards owned`}>{progress.percent}%</span>
              </p>
            </div>
          </div>

          <button className="export-button" onClick={() => exporter.exportSet(cardSet, ownership, filter, details, showReverseHolos)} title={`Export ${filter} cards to Excel`}>
            <span>⇩</span> Export Excel <small>· {filter === 'all' ? 'all' : filter}</small>
          </button>
        </div>

        <div className={`collection-controls${filtersExpanded ? ' filters-expanded' : ''}`}>
          <div className="progress-track"><span style={{ width: `${progress.percent}%` }} /></div>

          <div className="view-settings">
            <div className="layout-switch" aria-label="Card layout">
              <button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} aria-pressed={layout === 'grid'} title="Card grid">▦ <span>Cards</span></button>
              <button className={layout === 'details' ? 'active' : ''} onClick={() => setLayout('details')} aria-pressed={layout === 'details'} title="Detailed rows">☷ <span>Details</span></button>
              <button className={layout === 'binder' ? 'active' : ''} onClick={() => changeLayout('binder')} aria-pressed={layout === 'binder'} title="Card binder pages">▤ <span>Binder</span></button>
            </div>

            {layout === 'binder' && (
              <div className="view-tools">
                <label className={`tool-switch ${pageSize === 12 ? 'on' : ''}`} title="Off: 3 rows of 3 cards. On: 3 rows of 4 cards.">
                  <input type="checkbox" checked={pageSize === 12} onChange={event => changePageSize(event.target.checked ? 12 : 9)} />
                  <span className="tool-switch-track" aria-hidden="true"><i /></span>
                  <span className="tool-switch-label">Cards per page</span>
                  <output>{pageSize === 12 ? '3 × 4' : '3 × 3'}</output>
                </label>
              </div>
            )}

            {layout === 'grid' && (
              <label className="density-control">
                <span>CARDS PER ROW</span>
                <input type="range" min="2" max={maxGridColumns(columnProfile)} step="1" value={columns} onChange={event => setColumns(Number(event.target.value))} aria-label="Cards per row" />
                <output>{columns}</output>
              </label>
            )}
          </div>

          <div className="filter-panel">
            <button
              className="filters-toggle"
              type="button"
              aria-expanded={filtersExpanded}
              aria-controls="set-filter-controls"
              onClick={() => setFiltersExpanded(expanded => !expanded)}
            >
              <span className={`filters-toggle-arrow ${filtersExpanded ? 'expanded' : ''}`} aria-hidden="true" />
              <span>Filters</span>
              <small>{filter === 'all' ? 'All cards' : filter === 'owned' ? 'Owned' : 'Needed'}</small>
            </button>

            <div className="filter-panel-content" id="set-filter-controls" hidden={!filtersExpanded}>
              <div className="set-tools">
            {layout !== 'binder' && (
              <div className="filter-tabs" aria-label="Filter cards">
                {filters.map(option => (
                  <button key={option.id} className={filter === option.id ? 'filter-tab selected' : 'filter-tab'} onClick={() => changeFilter(option.id)}>
                    {option.label}
                    <span>
                      {option.id === 'all'
                        ? totalCount
                        : option.id === 'owned'
                          ? ownedCount
                          : neededCount}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <label className={`tool-switch ${showReverseHolos ? 'on' : ''}`} title="Show reverse holo copies beside their normal card">
              <input type="checkbox" checked={showReverseHolos} onChange={event => setShowReverseHolos(event.target.checked)} />
              <span className="tool-switch-track is-holo" aria-hidden="true"><i /></span>
              <span className="tool-switch-label">Reverse holos</span>
            </label>

            <label className="card-search">
              <span>⌕</span>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a card or number" aria-label="Find a card or number" />
              <kbd>/</kbd>
            </label>
              </div>

              <div className="set-action-row">
                {error && <div className="error-banner">{error}</div>}
                <RarityBreakdown cards={displayCards} details={details} isOwned={isOwned} />
                <div className="bulk-ownership-actions" role="group" aria-label="Update all cards in this collection">
                  <button type="button" onClick={() => onSetOwnership(setOwnershipKeys, true)} disabled={loadingDetails || setOwnershipKeys.length === 0}>
                    Mark all owned
                  </button>
                  <button type="button" onClick={() => onSetOwnership(setOwnershipKeys, false)} disabled={loadingDetails || setOwnershipKeys.length === 0}>
                    Mark all needed
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loadingDetails ? (
        <div className="loading-message"><span className="spinner" /> Loading card details and variants from TCGdex…</div>
      ) : !noCardsToShow ? (
        layout === 'binder' ? (
          <BinderPage
            key="binder"
            cards={binderCards}
            details={details}
            total={cardSet.cardCount?.total ?? cardSet.cards?.length ?? 0}
            pageSize={pageSize}
            page={currentPage}
            pageCount={pageCount}
            setName={cardSet.name}
            isOwned={isOwned}
            onToggle={entry => onToggleOwnership(entry.reverse ? reverseKey(entry.card.id) : entry.card.id)}
            onPageChange={goToPage}
          />
        ) : layout === 'grid' ? (
          <div key="grid" className="cards-scroll card-view-enter">
            <div ref={cardContainerRef} className="cards-grid" style={{ '--card-columns': columns } as CSSProperties}>
              {visibleCards.map(displayCard => (
                <GridCard
                  key={`${displayCard.card.id}:${displayCard.reverse ? 'reverse' : 'normal'}`}
                  card={displayCard.card}
                  total={cardSet.cardCount?.total ?? cardSet.cards?.length ?? 0}
                  reverse={displayCard.reverse}
                  details={details[displayCard.card.id]}
                  owned={isOwned(displayCard)}
                  onToggle={() => onToggleOwnership(displayCard.reverse ? reverseKey(displayCard.card.id) : displayCard.card.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div key="details" ref={cardContainerRef} className="detail-card-list card-view-enter">
            {visibleCards.map(displayCard => (
              <DetailedCardRow
                key={`${displayCard.card.id}:${displayCard.reverse ? 'reverse' : 'normal'}`}
                card={displayCard.card}
                total={cardSet.cardCount?.total ?? cardSet.cards?.length ?? 0}
                reverse={displayCard.reverse}
                details={details[displayCard.card.id]}
                owned={isOwned(displayCard)}
                onToggle={() => onToggleOwnership(displayCard.reverse ? reverseKey(displayCard.card.id) : displayCard.card.id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="empty-cards">
          <span>◇</span>
          <h2>{search ? 'No cards match that search' : filter === 'owned' ? 'No cards collected yet' : 'You’ve collected every card!'}</h2>
          <p>{search ? 'Clear the search box to see the whole set again.' : filter === 'owned' ? 'Click or tap a card to mark it as owned.' : 'Try another filter to see the set.'}</p>
        </div>
      )}

      {!loadingDetails && !noCardsToShow && (
        <footer className="list-footer">
          {layout === 'binder'
            ? `Page ${currentPage + 1} of ${pageCount} - showing ${pageCards.length} of ${binderCards.length} cards`
            : `Showing ${visibleCards.length} of ${displayCards.length} cards`}
          <span>Changes save automatically on this device</span>
        </footer>
      )}
    </section>
  )
}
