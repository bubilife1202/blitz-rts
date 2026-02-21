import type { PartId } from '../core/types'

export interface Inventory {
  readonly ownedParts: Set<PartId>
  readonly gold: number
}

const STARTER_PARTS: readonly PartId[] = [
  'MP01',
  'MP02',
  'MP03',
  'BP01',
  'BP02',
  'AP01',
  'AP05',
  'ACP01',
  'ACP03',
]

const PART_PRICES: Record<PartId, number> = {
  MP01: 0,
  MP02: 0,
  MP03: 0,
  MP04: 200,
  MP05: 150,

  BP01: 0,
  BP02: 0,
  BP03: 250,
  BP04: 200,
  BP05: 300,

  AP01: 0,
  AP02: 250,
  AP03: 300,
  AP04: 250,
  AP05: 0,

  ACP01: 0,
  ACP02: 100,
  ACP03: 0,
  ACP04: 100,
  ACP05: 150,

  MP06: 150,
  MP07: 200,
  MP08: 250,

  BP06: 100,
  BP07: 180,

  AP06: 200,
  AP07: 120,
  AP08: 280,

  ACP06: 100,
  ACP07: 200,
}

export function createStartingInventory(): Inventory {
  return {
    ownedParts: new Set(STARTER_PARTS),
    gold: 0,
  }
}

export function getPartPrice(partId: PartId): number {
  return PART_PRICES[partId]
}

export function ownsPart(inventory: Inventory, partId: PartId): boolean {
  return inventory.ownedParts.has(partId)
}

export function buyPart(inventory: Inventory, partId: PartId): Inventory | null {
  if (ownsPart(inventory, partId)) return null
  const price = getPartPrice(partId)
  if (inventory.gold < price) return null

  const nextOwned = new Set(inventory.ownedParts)
  nextOwned.add(partId)
  return {
    ownedParts: nextOwned,
    gold: inventory.gold - price,
  }
}

export function addGold(inventory: Inventory, amount: number): Inventory {
  if (!Number.isFinite(amount)) throw new Error('amount must be a finite number')
  if (amount < 0) throw new Error('amount must be >= 0')
  return {
    ownedParts: new Set(inventory.ownedParts),
    gold: inventory.gold + amount,
  }
}

export function addParts(inventory: Inventory, parts: readonly PartId[]): Inventory {
  const nextOwned = new Set(inventory.ownedParts)
  for (const partId of parts) {
    nextOwned.add(partId)
  }
  return {
    ownedParts: nextOwned,
    gold: inventory.gold,
  }
}
