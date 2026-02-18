import type { PartId } from '../core/types'
import { ACCESSORY_PARTS, BODY_PARTS, LEGS_PARTS, WEAPON_PARTS } from '../data/parts-data'
import type { Inventory } from '../assembly/inventory'
import { getPartPrice, ownsPart } from '../assembly/inventory'

export interface ShopUiCallbacks {
  onBuy(partId: PartId): void
  onBack(): void
}

type ShopHandle = { destroy(): void; refresh(inventory: Inventory): void }

function injectStyles(): void {
  if (document.getElementById('shop-ui-styles')) return
  const style = document.createElement('style')
  style.id = 'shop-ui-styles'
  style.textContent = `
    .shop-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .shop-sections {
      display: grid;
      gap: 12px;
    }

    .shop-card {
      cursor: default;
      min-height: 92px;
    }

    .shop-card:hover {
      transform: none;
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(20, 20, 37, 0.65);
    }

    .shop-card-head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 10px;
    }

    .shop-price {
      font-family: var(--mono);
      color: var(--gold);
      white-space: nowrap;
    }

    .shop-price-muted {
      opacity: 0.6;
    }

    .badge-owned {
      border-color: rgba(102, 187, 106, 0.8);
      color: #a6f0aa;
    }

    .shop-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
      margin-top: 10px;
    }
  `
  document.head.appendChild(style)
}

function goldText(gold: number): string {
  return `${gold} G`
}

function keyStatText(part: { readonly slot: string } & Record<string, unknown>): string {
  switch (part.slot) {
    case 'legs': {
      const speed = part['speed']
      const load = part['loadCapacity']
      return `SPD ${String(speed)} · LOAD ${String(load)}`
    }
    case 'body': {
      const mount = part['mountType']
      const hp = part['hp']
      const def = part['defense']
      return `MNT ${String(mount)} · HP ${String(hp)} · DEF ${String(def)}`
    }
    case 'weapon': {
      const mount = part['mountType']
      const atk = part['attack']
      const range = part['range']
      const fr = part['fireRate']
      return `MNT ${String(mount)} · ATK ${String(atk)} · R ${String(range)} · FR ${String(fr)}`
    }
    case 'accessory': {
      const eff = part['effect'] as { readonly kind?: string } | undefined
      return `FX ${eff?.kind ?? '—'}`
    }
    default:
      return '—'
  }
}

function renderSection(params: {
  readonly title: string
  readonly parts: readonly { readonly id: PartId; readonly name: string; readonly slot: string }[]
  readonly inventory: Inventory
  readonly onBuy: (partId: PartId) => void
}): HTMLDivElement {
  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">${params.title}</h2>
      <div class="muted">20 parts total</div>
    </div>
    <div class="panel-body">
      <div class="card-grid" data-role="grid"></div>
    </div>
  `

  const grid = panel.querySelector<HTMLDivElement>('[data-role="grid"]')
  if (!grid) throw new Error('Missing shop grid')

  for (const part of params.parts) {
    const owned = ownsPart(params.inventory, part.id)
    const price = getPartPrice(part.id)
    const canAfford = params.inventory.gold >= price

    const card = document.createElement('div')
    card.className = 'card shop-card'

    const head = document.createElement('div')
    head.className = 'shop-card-head'

    const left = document.createElement('div')
    const title = document.createElement('div')
    title.className = 'card-title'
    title.textContent = part.name
    const sub = document.createElement('div')
    sub.className = 'card-sub mono'
    sub.textContent = keyStatText(part as unknown as { readonly slot: string } & Record<string, unknown>)
    left.appendChild(title)
    left.appendChild(sub)

    const right = document.createElement('div')
    if (owned) {
      const badge = document.createElement('span')
      badge.className = 'badge badge-owned'
      badge.textContent = 'Owned'
      right.appendChild(badge)
    } else {
      const priceEl = document.createElement('div')
      priceEl.className = `shop-price ${canAfford ? '' : 'shop-price-muted'}`.trim()
      priceEl.textContent = `${price} G`
      right.appendChild(priceEl)
    }

    head.appendChild(left)
    head.appendChild(right)
    card.appendChild(head)

    const actions = document.createElement('div')
    actions.className = 'shop-actions'
    const buyBtn = document.createElement('button')
    buyBtn.type = 'button'
    buyBtn.className = 'btn btn-primary'
    buyBtn.textContent = 'Buy'
    buyBtn.disabled = owned || !canAfford
    buyBtn.addEventListener('click', () => {
      if (buyBtn.disabled) return
      params.onBuy(part.id)
    })
    actions.appendChild(buyBtn)
    card.appendChild(actions)

    grid.appendChild(card)
  }

  return panel
}

export function createShopUi(
  container: HTMLElement,
  inventory: Inventory,
  callbacks: ShopUiCallbacks,
): ShopHandle {
  injectStyles()

  let currentInv = inventory

  const screen = document.createElement('div')
  screen.className = 'screen'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const top = document.createElement('div')
  top.className = 'shop-top'

  const goldPill = document.createElement('span')
  goldPill.className = 'pill'
  goldPill.innerHTML = `골드 <strong class="mono" data-role="gold">${goldText(currentInv.gold)}</strong>`

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'btn btn-ghost'
  backBtn.textContent = 'Back'
  backBtn.addEventListener('click', () => callbacks.onBack())

  top.appendChild(goldPill)
  top.appendChild(backBtn)

  const sections = document.createElement('div')
  sections.className = 'shop-sections'

  function renderAll(): void {
    const goldEl = goldPill.querySelector<HTMLElement>('[data-role="gold"]')
    if (!goldEl) throw new Error('Missing gold element')
    goldEl.textContent = goldText(currentInv.gold)

    sections.replaceChildren(
      renderSection({
        title: 'LEGS',
        parts: LEGS_PARTS,
        inventory: currentInv,
        onBuy: callbacks.onBuy,
      }),
      renderSection({
        title: 'BODY',
        parts: BODY_PARTS,
        inventory: currentInv,
        onBuy: callbacks.onBuy,
      }),
      renderSection({
        title: 'WEAPON',
        parts: WEAPON_PARTS,
        inventory: currentInv,
        onBuy: callbacks.onBuy,
      }),
      renderSection({
        title: 'ACCESSORY',
        parts: ACCESSORY_PARTS,
        inventory: currentInv,
        onBuy: callbacks.onBuy,
      }),
    )
  }

  screen.appendChild(title)
  screen.appendChild(top)
  screen.appendChild(sections)
  container.replaceChildren(screen)

  renderAll()

  return {
    destroy(): void {
      screen.remove()
    },
    refresh(next: Inventory): void {
      currentInv = next
      renderAll()
    },
  }
}
