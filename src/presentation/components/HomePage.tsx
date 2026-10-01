import { useEffect, useRef, useState } from 'react'
import type { CardSet, EraBrief, Ownership } from '../../domain/models'
import { setProgress } from '../../application/collection'
import { isUnknownSet, setTotalCount, setTotalsFor, type SetTotals } from '../../application/setTotals'
import { TcgdexCatalog } from '../../adapters/tcgdex/TcgdexCatalog'
import { slugify } from '../card-utils'
import { Logo } from './Logo'

type Props = {
  eras: EraBrief[]
  ownership: Ownership
  loading: boolean
  error: string
  totalCards: number
  totalUnique: number
}

const catalog = new TcgdexCatalog()

function collectionSlug(set: CardSet): string {
  return slugify(set.name)
}

/**
 * TCGdex never reports reverse holo prints on `/series/:id`, so sets that are missing from the
 * snapshot synced at build time (`npm run sync:totals`) still need one cheap lookup each.
 */
async function lookupSetTotals(set: CardSet): Promise<SetTotals> {
  const cardSet = await catalog.getSet(set.id)
  return {
    total: cardSet.cards?.length ?? cardSet.cardCount?.total ?? 0,
    reverse: cardSet.cardCount?.reverse ?? 0,
  }
}

export function HomePage({ eras, ownership, loading, error, totalCards, totalUnique }: Props) {
  const [provisionalTotals, setProvisionalTotals] = useState<Record<string, SetTotals>>({})
  const lookedUpSets = useRef(new Set<string>())
  const [collapsedEras, setCollapsedEras] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('mikudex.collapsed-eras') ?? '{}') as Record<string, boolean>
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem('mikudex.collapsed-eras', JSON.stringify(collapsedEras))
  }, [collapsedEras])

  useEffect(() => {
    if (loading) return
    const pendingSets = eras
      .flatMap(era => era.sets ?? [])
      .filter(set => isUnknownSet(set.id) && !lookedUpSets.current.has(set.id))
    if (!pendingSets.length) return

    let current = true
    const queue = [...pendingSets]

    async function worker() {
      while (queue.length) {
        const set = queue.shift()
        if (!set) return
        lookedUpSets.current.add(set.id)
        try {
          const totals = await lookupSetTotals(set)
          if (current) setProvisionalTotals(previous => ({ ...previous, [set.id]: totals }))
        } catch {
          // Offline or removed set: fall back to the counters TCGdex already gave the series.
        }
      }
    }

    void Promise.all(Array.from({ length: Math.min(6, pendingSets.length) }, worker))
    return () => {
      current = false
    }
  }, [eras, loading])

  function toggleEra(id: string) {
    setCollapsedEras(previous => ({ ...previous, [id]: !previous[id] }))
  }

  const catalogTotal = eras
    .flatMap(era => era.sets ?? [])
    .reduce((sum, set) => sum + setTotalCount(set, provisionalTotals), 0)

  return (
    <section className="home-page">
      <div className="intro-row">
        <div>
          <div className="kicker">YOUR PERSONAL CARD ARCHIVE</div>
          <h1>Pokémon TCG <span>collection tracker</span></h1>
          <p>Every set, every card. Your collection, right where you left it.</p>
        </div>

        <div className="collection-total">
          <strong>{totalUnique}<small> / {catalogTotal.toLocaleString()}</small></strong>
          <span>unique cards collected</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-message"><span className="spinner" /> Loading eras and collections…</div>
      ) : eras.map(era => (
        <section className="era-section" key={era.id}>
          <button
            type="button"
            className="era-heading"
            onClick={() => toggleEra(era.id)}
            aria-expanded={!collapsedEras[era.id]}
            aria-controls={`sets-${era.id}`}
          >
            <div className="era-logo-box">
              <Logo
                src={era.logo}
                fallbackSrc={era.sets?.find(set => set.logo)?.logo}
                alt={`${era.name} logo`}
                className="era-logo"
              />
            </div>
            <div className="era-name">
              <h2>{era.name}</h2>
              <span>{era.sets?.length ?? 0} collections</span>
            </div>
            <span className="era-rule" />
            <span className={`era-collapse-icon ${collapsedEras[era.id] ? 'collapsed' : ''}`} aria-hidden="true" />
          </button>

          {!collapsedEras[era.id] && (
            <div className="sets-grid" id={`sets-${era.id}`}>
              {era.sets?.map(set => {
                const progress = setProgress(set, ownership, setTotalsFor(set, provisionalTotals))

                return (
                  <a className="set-tile" key={set.id} href={`/${collectionSlug(set)}`}>
                    <div className="set-logo-frame">
                      <Logo
                        src={set.logo}
                        fallbackSrc={set.symbol}
                        alt={`${set.name} logo`}
                        className={`set-logo ${set.logo ? '' : 'set-logo-symbol'}`}
                      />
                      <span className="set-open-arrow">↗</span>
                    </div>
                    <div className="set-tile-info">
                      <span className="set-tile-name">{set.name}</span>
                      <span className="set-tile-progress">{progress.owned} <i>/</i> {progress.total} <small>cards</small></span>
                    </div>
                    <div className="set-progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
                  </a>
                )
              })}
            </div>
          )}
        </section>
      ))}

      {!loading && eras.length === 0 && !error && <div className="empty-cards">No sets were returned by the catalog.</div>}

      <div className="home-note">
        Collection data and artwork provided by <a href="https://tcgdex.dev" target="_blank" rel="noreferrer">TCGdex</a>
        <span>{totalCards} physical cards · {totalUnique} unique cards owned</span>
      </div>
    </section>
  )
}
