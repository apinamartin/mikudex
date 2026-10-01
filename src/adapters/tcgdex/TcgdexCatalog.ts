import type { CatalogPort, CardDetails, CardSet, EraBrief } from '../../domain/models'

const API = 'https://api.tcgdex.net/v2/en'

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`)
  if (!response.ok) throw new Error(`TCGdex request failed (${response.status}).`)
  return response.json() as Promise<T>
}

export class TcgdexCatalog implements CatalogPort {
  async getEras(): Promise<EraBrief[]> {
    const eras = await get<EraBrief[]>('/series')
    // TCGdex returns series in release order, oldest first.
    return eras.reverse()
  }
  getEra(id: string): Promise<EraBrief> { return get<EraBrief>(`/series/${encodeURIComponent(id)}`) }
  getSet(id: string): Promise<CardSet> { return get<CardSet>(`/sets/${encodeURIComponent(id)}`) }
  getCard(id: string): Promise<CardDetails> { return get<CardDetails>(`/cards/${encodeURIComponent(id)}`) }
}
