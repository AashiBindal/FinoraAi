// Generic localStorage CRUD used by transactions, subscriptions and goals in
// local (demo) mode. With the backend (DATA_SOURCE=api) the services use the
// REST adapters in services/api/finoraApi.ts, which have the same interface.

import { delay, newId, storage } from './storage'

export interface CollectionService<T extends { id: string }, Input> {
  list(): Promise<T[]>
  create(input: Input): Promise<T>
  createMany(inputs: Input[]): Promise<T[]>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}

export function createCollection<T extends { id: string }, Input>(opts: {
  /** localStorage key */
  key: string
  idPrefix: string
  /** Fill server-side fields for local mode (id is added automatically) */
  build: (input: Input) => Omit<T, 'id'>
  sort?: (a: T, b: T) => number
}): CollectionService<T, Input> {
  const load = () => storage.get<T[]>(opts.key, [])
  const save = (items: T[]) => storage.set(opts.key, opts.sort ? [...items].sort(opts.sort) : items)

  return {
    list: () => delay(opts.sort ? [...load()].sort(opts.sort) : load()),
    async create(input) {
      const item = { ...opts.build(input), id: newId(opts.idPrefix) } as T
      save([item, ...load()])
      return delay(item)
    },
    async createMany(inputs) {
      const items = inputs.map((i) => ({ ...opts.build(i), id: newId(opts.idPrefix) }) as T)
      save([...items, ...load()])
      return delay(items)
    },
    async update(id, patch) {
      const items = load()
      const idx = items.findIndex((i) => i.id === id)
      if (idx < 0) throw new Error('Item not found. It may have been deleted.')
      const updated = { ...items[idx], ...patch, id } as T
      items[idx] = updated
      save(items)
      return delay(updated)
    },
    async remove(id) {
      save(load().filter((i) => i.id !== id))
      return delay(undefined)
    },
  }
}
