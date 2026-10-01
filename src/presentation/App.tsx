import { useEffect, useRef, useState } from 'react'
import type { CardSet, EraBrief, Ownership } from '../domain/models'
import { TcgdexCatalog } from '../adapters/tcgdex/TcgdexCatalog'
import { LocalOwnership } from '../adapters/storage/LocalOwnership'
import { slugify } from './card-utils'
import { AppHeader } from './components/AppHeader'
import { HomePage } from './components/HomePage'
import { SetPage } from './components/SetPage'
import './app.css'
import './layout.css'
import './collection-ui.css'

const catalog = new TcgdexCatalog()
const storage = new LocalOwnership()

function collectionSlug(set: CardSet): string {
  return slugify(set.name)
}

function collectionPathFromLocation(): string | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  return path || null
}

function App() {
  const mainRef = useRef<HTMLElement>(null)
  const [eras, setEras] = useState<EraBrief[]>([])
  const [activeSet, setActiveSet] = useState<CardSet | null>(null)
  const [routeCollection, setRouteCollection] = useState<string | null>(() => collectionPathFromLocation())
  const [ownership, setOwnership] = useState<Ownership>(() => storage.load())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true

    async function loadCatalog() {
      setLoading(true)
      setError('')

      try {
        const briefs = await catalog.getEras()
        const detailed = await Promise.all(briefs.map(era => catalog.getEra(era.id)))
        if (current) {
          setEras(detailed.map(era => ({
            ...era,
            sets: era.sets ? [...era.sets].reverse() : [],
          })))
        }
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : 'Could not load TCGdex.')
      } finally {
        if (current) setLoading(false)
      }
    }

    void loadCatalog()
    return () => {
      current = false
    }
  }, [])

  useEffect(() => {
    const syncRoute = () => setRouteCollection(collectionPathFromLocation())
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    let current = true

    async function loadCollection() {
      if (!routeCollection) {
        if (current) setActiveSet(null)
        return
      }

      if (loading) return

      const matchedSet = eras
        .flatMap(era => era.sets ?? [])
        .find(set => collectionSlug(set) === routeCollection)

      if (!matchedSet) {
        if (current) {
          setActiveSet(null)
          setError('This collection could not be found.')
        }
        return
      }

      if (current) setActiveSet(null)

      try {
        const cardSet = await catalog.getSet(matchedSet.id)
        if (current) setActiveSet(cardSet)
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : 'Could not load this collection.')
      }
    }

    void loadCollection()

    return () => {
      current = false
    }
  }, [eras, loading, routeCollection])

  useEffect(() => {
    storage.save(ownership)
  }, [ownership])

  function toggleOwnership(id: string) {
    setOwnership(previous => {
      const next = { ...previous }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  }

  function setCollectionOwnership(ids: string[], owned: boolean) {
    setOwnership(previous => {
      const next = { ...previous }
      for (const id of ids) {
        if (owned) next[id] = 1
        else delete next[id]
      }
      return next
    })
  }

  const totalCards = Object.values(ownership).reduce((sum, value) => sum + value, 0)
  const totalUnique = Object.values(ownership).filter(value => value > 0).length

  return (
    <div className="tracker-app">
      <AppHeader totalCards={totalCards} />

      <main ref={mainRef}>
        {activeSet ? (
          <SetPage
            key={activeSet.id}
            cardSet={activeSet}
            ownership={ownership}
            onToggleOwnership={toggleOwnership}
            onSetOwnership={setCollectionOwnership}
          />
        ) : routeCollection ? (
          <section className="set-page">
            <div className="route-loading">
              {error ? (
                <>
                  <p>{error}</p>
                  <a href="/">Back to all collections</a>
                </>
              ) : (
                <><span className="spinner" /> Loading collection…</>
              )}
            </div>
          </section>
        ) : (
          <HomePage
            eras={eras}
            ownership={ownership}
            loading={loading}
            error={error}
            totalCards={totalCards}
            totalUnique={totalUnique}
          />
        )}
      </main>
    </div>
  )
}

export default App
