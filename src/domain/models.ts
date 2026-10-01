export type CardBrief = { id: string; localId: string; name: string; image?: string }
export type CardDetails = CardBrief & {
  rarity?: string
  types?: string[]
  category?: string
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean }
  pricing?: {
    cardmarket?: { avg?: number; unit?: string }
    tcgplayer?: { unit?: string; normal?: { marketPrice?: number } }
  }
}
export type CardSet = { id: string; name: string; logo?: string; symbol?: string; releaseDate?: string; cardCount: { total: number; official?: number; reverse?: number }; cards?: CardBrief[] }
export type EraBrief = { id: string; name: string; logo?: string; sets?: CardSet[] }
export type Ownership = Record<string, number>
export type CardFilter = 'all' | 'owned' | 'need'

export interface CatalogPort {
  getEras(): Promise<EraBrief[]>
  getEra(id: string): Promise<EraBrief>
  getSet(id: string): Promise<CardSet>
  getCard(id: string): Promise<CardDetails>
}
export interface OwnershipPort {
  load(): Ownership
  save(ownership: Ownership): void
}
export interface ExportPort {
  exportSet(set: CardSet, ownership: Ownership, filter: CardFilter, details?: Record<string, CardDetails>, showReverseHolos?: boolean): void
}
