import type { Ownership, OwnershipPort } from '../../domain/models'

const KEY = 'mikudex.collection.v1'

export class LocalOwnership implements OwnershipPort {
  load(): Ownership {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
      return Object.fromEntries(Object.entries(value).filter(([, count]) => Number.isInteger(count) && (count as number) > 0))
    } catch { return {} }
  }
  save(ownership: Ownership): void { localStorage.setItem(KEY, JSON.stringify(ownership)) }
}
