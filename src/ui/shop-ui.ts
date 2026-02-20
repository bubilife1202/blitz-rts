import type { PartId, PartSlot } from '../core/types'
import { ACCESSORY_PARTS, BODY_PARTS, LEGS_PARTS, WEAPON_PARTS } from '../data/parts-data'
import type { Inventory } from '../assembly/inventory'
import { getPartPrice, ownsPart } from '../assembly/inventory'
import { renderPartSvg } from './mech-renderer'

export interface ShopUiCallbacks {
  onBuy(partId: PartId): void
  onBack(): void
}

type ShopHandle = { destroy(): void; refresh(inventory: Inventory): void }

function goldText(gold: number): string {
  return `${gold} G`
}

type ShopCategory = 'legs' | 'body' | 'weapon' | 'accessory'

function categoryLabelKo(category: ShopCategory): string {
  switch (category) {
    case 'legs':
      return '다리'
    case 'body':
      return '몸체'
    case 'weapon':
      return '무기'
    case 'accessory':
      return '보조'
  }
}

function tierForPrice(price: number): 'basic' | 'standard' | 'advanced' | 'elite' {
  if (price <= 0) return 'basic'
  if (price <= 150) return 'standard'
  if (price <= 250) return 'advanced'
  return 'elite'
}

function tierClass(tier: 'basic' | 'standard' | 'advanced' | 'elite'): string {
  switch (tier) {
    case 'basic':
      return 'tier-basic'
    case 'standard':
      return 'tier-standard'
    case 'advanced':
      return 'tier-advanced'
    case 'elite':
      return 'tier-elite'
  }
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

export function createShopUi(
  container: HTMLElement,
  inventory: Inventory,
  callbacks: ShopUiCallbacks,
): ShopHandle {
  let currentInv = inventory

  let activeCategory: ShopCategory = 'legs'

  const screen = document.createElement('div')
  screen.className = 'screen shop-layout'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const top = document.createElement('div')
  top.className = 'topbar shop-head'

  const goldPill = document.createElement('span')
  goldPill.className = 'pill'
  goldPill.innerHTML = `골드 <strong class="mono" data-role="gold">${goldText(currentInv.gold)}</strong>`

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'btn btn-ghost'
  backBtn.textContent = '뒤로'
  backBtn.addEventListener('click', () => callbacks.onBack())

  top.appendChild(goldPill)
  top.appendChild(backBtn)

  const shopPanel = document.createElement('div')
  shopPanel.className = 'panel'

  const shopHeader = document.createElement('div')
  shopHeader.className = 'panel-header'
  shopHeader.innerHTML = `<h2 class="panel-title">상점</h2><div class="muted">파츠를 구매해 조립 옵션을 확장하세요</div>`

  const shopBody = document.createElement('div')
  shopBody.className = 'panel-body'

  const categoryTabs = document.createElement('div')
  categoryTabs.className = 'category-tabs'

  const tabButtons: Array<{ readonly cat: ShopCategory; readonly el: HTMLButtonElement }> = []
  for (const cat of ['legs', 'body', 'weapon', 'accessory'] as const) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tab'
    btn.textContent = categoryLabelKo(cat)
    btn.setAttribute('aria-pressed', cat === activeCategory ? 'true' : 'false')
    btn.addEventListener('click', () => {
      activeCategory = cat
      renderAll()
    })
    tabButtons.push({ cat, el: btn })
    categoryTabs.appendChild(btn)
  }

  const gridWrap = document.createElement('div')
  gridWrap.className = 'shop-grid'

  const partsGrid = document.createElement('div')
  partsGrid.className = 'card-grid'

  gridWrap.appendChild(partsGrid)

  shopBody.appendChild(categoryTabs)
  shopBody.appendChild(gridWrap)
  shopPanel.appendChild(shopHeader)
  shopPanel.appendChild(shopBody)

  function renderAll(): void {
    const goldEl = goldPill.querySelector<HTMLElement>('[data-role="gold"]')
    if (!goldEl) throw new Error('Missing gold element')
    goldEl.textContent = goldText(currentInv.gold)

    for (const t of tabButtons) {
      t.el.setAttribute('aria-pressed', t.cat === activeCategory ? 'true' : 'false')
    }

    const parts = activeCategory === 'legs'
      ? LEGS_PARTS
      : activeCategory === 'body'
        ? BODY_PARTS
        : activeCategory === 'weapon'
          ? WEAPON_PARTS
          : ACCESSORY_PARTS

    partsGrid.innerHTML = ''
    for (const part of parts) {
      const owned = ownsPart(currentInv, part.id)
      const price = getPartPrice(part.id)
      const canAfford = currentInv.gold >= price
      const tier = tierForPrice(price)

      const card = document.createElement('div')
      card.className = 'card'

      const tierEl = document.createElement('div')
      tierEl.className = `tier-bar ${tierClass(tier)}`
      card.appendChild(tierEl)

      const row = document.createElement('div')
      row.className = 'part-card'

      const preview = document.createElement('div')
      preview.className = 'part-preview'
      preview.innerHTML = renderPartSvg(part.slot as PartSlot, part.id, 38)

      const main = document.createElement('div')
      const head = document.createElement('div')
      head.style.display = 'flex'
      head.style.alignItems = 'start'
      head.style.justifyContent = 'space-between'
      head.style.gap = '10px'

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
      right.style.display = 'grid'
      right.style.justifyItems = 'end'
      right.style.gap = '8px'
      if (owned) {
        const badge = document.createElement('span')
        badge.className = 'badge badge-easy'
        badge.textContent = '보유'
        right.appendChild(badge)
      } else {
        const priceEl = document.createElement('div')
        priceEl.className = `price ${canAfford ? '' : 'price-muted'}`.trim()
        priceEl.textContent = `${price} G`
        right.appendChild(priceEl)
      }

      head.appendChild(left)
      head.appendChild(right)
      main.appendChild(head)

      const actions = document.createElement('div')
      actions.style.display = 'flex'
      actions.style.justifyContent = 'flex-end'
      actions.style.gap = '8px'
      actions.style.marginTop = '10px'

      const buyBtn = document.createElement('button')
      buyBtn.type = 'button'
      buyBtn.className = 'btn btn-primary'
      buyBtn.textContent = '구매'
      buyBtn.disabled = owned || !canAfford
      buyBtn.addEventListener('click', () => {
        if (buyBtn.disabled) return
        callbacks.onBuy(part.id)
      })
      actions.appendChild(buyBtn)
      main.appendChild(actions)

      row.appendChild(preview)
      row.appendChild(main)
      card.appendChild(row)

      partsGrid.appendChild(card)
    }
  }

  screen.appendChild(title)
  screen.appendChild(top)
  screen.appendChild(shopPanel)
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
