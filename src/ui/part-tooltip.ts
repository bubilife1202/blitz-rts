import type {
  AccessoryEffect,
  AccessoryId,
  BodyId,
  Build,
  LegsId,
  PartId,
  SynergyDefinition,
  WeaponId,
  WeaponSpecial,
} from '../core/types'
import { calculateBuildDerived } from '../assembly/parts'
import { getPartPrice } from '../assembly/inventory'
import { findSynergies } from '../assembly/synergy'
import {
  ACCESSORY_PARTS,
  BODY_PARTS,
  LEGS_PARTS,
  WEAPON_PARTS,
} from '../data/parts-data'

type PartCategory = 'legs' | 'body' | 'weapon' | 'accessory'

// ── Singleton tooltip element ──────────────────────────

let tooltipEl: HTMLDivElement | null = null

function getTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl
  const el = document.createElement('div')
  el.className = 'part-tooltip'
  document.body.appendChild(el)
  tooltipEl = el
  return el
}

// ── Helpers ────────────────────────────────────────────

function categoryIconKo(category: PartCategory): string {
  switch (category) {
    case 'legs':
      return '\u2699 \uB2E4\uB9AC'
    case 'body':
      return '\u2699 \uBAB8\uCCB4'
    case 'weapon':
      return '\u2694 \uBB34\uAE30'
    case 'accessory':
      return '\u2606 \uBCF4\uC870'
  }
}

function moveTypeKo(moveType: string): string {
  const labels: Record<string, string> = {
    'reverse-joint': '\uC2A4\uCE74\uC6C3(\uC5ED\uAD00\uC808)',
    humanoid: '\uC6CC\uCEE4(\uC778\uAC04\uD615)',
    flying: '\uD638\uBC84(\uBE44\uD589)',
    tank: '\uD0F1\uD06C(\uBB34\uD55C\uADA4\uB3C4)',
    quadruped: '\uC2A4\uD30C\uC774\uB354(\uC0AC\uC871)',
    wheeled: '\uC2A4\uD2B8\uB77C\uC774\uB354(\uCC28\uB968)',
    hexapod: '\uACE8\uB9AC\uC557(\uC721\uC871)',
  }
  return labels[moveType] ?? moveType
}

function weaponSpecialDescKo(special: WeaponSpecial): string {
  switch (special.kind) {
    case 'none':
      return '\uC5C6\uC74C'
    case 'vulcan-armor-pierce':
      return `\uBC29\uC5B4 \uAD00\uD1B5 (DEF x${special.defenseMultiplier})`
    case 'sniper-farthest':
      return '\uAC00\uC7A5 \uBA3C \uC801 \uC6B0\uC120 \uACF5\uACA9'
    case 'missile-splash':
      return `\uC2A4\uD50C\uB798\uC2DC (${special.splashRange}\uD0C0\uC77C)`
    case 'hammer-true-damage':
      return `\uACE0\uC815 \uB300\uBBF8\uC9C0 (maxHP ${Math.round(special.maxHpPercent * 100)}%)`
    case 'laser-pierce':
      return `\uAD00\uD1B5 (${special.pierceCount}\uCCB4)`
    case 'shotgun-close':
      return `\uADFC\uC811 \uBCF4\uB108\uC2A4 x${special.closeRangeMultiplier} (${special.closeRange}\uD0C0\uC77C)`
    case 'railgun-charge':
      return `\uCC28\uC9C0 ${special.chargeSeconds}\uCD08 \u2192 x${special.chargeMultiplier}`
  }
}

function accessoryEffectDescKo(effect: AccessoryEffect): string {
  switch (effect.kind) {
    case 'attack-flat':
      return `\uACF5\uACA9\uB825 +${effect.attackBonus}`
    case 'defense-flat':
      return `\uBC29\uC5B4\uB825 +${effect.defenseBonus}`
    case 'watt-cost-multiplier':
      return `\uC640\uD2B8 \uBE44\uC6A9 x${effect.multiplier}`
    case 'hp-flat':
      return `HP +${effect.hpBonus}`
    case 'range-fireRate-flat':
      return `\uC0AC\uAC70\uB9AC +${effect.rangeBonus}, \uC5F0\uC0AC +${effect.fireRateBonus}`
    case 'speed-flat':
      return `\uC18D\uB3C4 +${effect.speedBonus}`
    case 'stealth':
      return '\uC2A4\uD154\uC2A4 (\uACF5\uACA9 \uC2DC \uD574\uC81C)'
  }
}

interface StatRow {
  readonly label: string
  readonly current: number | string
  readonly candidate: number | string
  readonly unit?: string
  /** If true, lower is better (e.g. weight) */
  readonly lowerBetter?: boolean
}

function statDeltaHtml(current: number, candidate: number, unit: string, lowerBetter: boolean): string {
  const delta = candidate - current
  if (delta === 0) return '<span class="stat-neutral">\u2014</span>'
  const sign = delta > 0 ? '+' : ''
  const effectiveGood = lowerBetter ? delta < 0 : delta > 0
  const cls = effectiveGood ? 'stat-up' : 'stat-down'
  const arrow = effectiveGood ? '\u25B2' : '\u25BC'
  return `<span class="${cls}">${sign}${delta}${unit} ${arrow}</span>`
}

function buildWithPart(build: Build, category: PartCategory, partId: PartId | null): Build {
  switch (category) {
    case 'legs':
      return partId ? { ...build, legsId: partId as LegsId } : build
    case 'body':
      return partId ? { ...build, bodyId: partId as BodyId } : build
    case 'weapon':
      return partId ? { ...build, weaponId: partId as WeaponId } : build
    case 'accessory':
      return { ...build, accessoryId: partId as AccessoryId | null }
  }
}

function findNewSynergiesForPart(
  build: Build,
  category: PartCategory,
  partId: PartId | null,
): readonly SynergyDefinition[] {
  const candidateBuild = buildWithPart(build, category, partId)
  const currentSyns = findSynergies(build)
  const candidateSyns = findSynergies(candidateBuild)
  const currentIds = new Set(currentSyns.map((s) => s.id))
  return candidateSyns.filter((s) => !currentIds.has(s.id))
}

function bonusTextKo(bonus: SynergyDefinition['bonus']): string {
  switch (bonus.kind) {
    case 'range-flat':
      return `\uC0AC\uAC70\uB9AC +${bonus.value}`
    case 'fire-rate-flat':
      return `\uC5F0\uC0AC\uB825 +${bonus.value}`
    case 'attack-percent':
      return `\uACF5\uACA9\uB825 +${Math.round(bonus.value * 100)}%`
    case 'defense-aura':
      return `\uBC29\uC5B4 \uC624\uB77C +${bonus.value} (\uBC18\uACBD ${bonus.range})`
    case 'speed-damage':
      return `\uC774\uC18D \uBE44\uB840 \uB300\uBBF8\uC9C0 ${Math.round(bonus.percent * 100)}%`
    case 'splash-range-flat':
      return `\uC2A4\uD50C\uB798\uC2DC +${bonus.value}`
    case 'move-attack':
      return '\uC774\uB3D9 \uC911 \uACF5\uACA9'
    case 'crit-chance':
      return `\uCE58\uBA85\uD0C0 +${Math.round(bonus.percent * 100)}%`
    case 'first-hit-multiplier':
      return `\uCCAB \uD0C0\uACA9 x${bonus.multiplier}`
  }
}

// ── Tooltip Content Builders ──────────────────────────

function buildLegsContent(partId: PartId, build: Build, locked: boolean, ownedParts: ReadonlySet<string> | undefined): string {
  const part = LEGS_PARTS.find((p) => p.id === partId)
  if (!part) return ''

  const currentDerived = calculateBuildDerived(build)
  const candidateBuild = buildWithPart(build, 'legs', partId)
  const candidateDerived = calculateBuildDerived(candidateBuild)

  const rows: StatRow[] = [
    { label: '\uC18D\uB3C4', current: currentDerived.core.speed, candidate: candidateDerived.core.speed },
    { label: '\uC801\uC7AC\uB7C9', current: currentDerived.core.loadCapacity, candidate: candidateDerived.core.loadCapacity },
    { label: '\uBB34\uAC8C', current: 0, candidate: part.weight, unit: '', lowerBetter: true },
  ]

  const moveRow = `<div class="tooltip-stat-row"><span class="tooltip-stat-label">\uC774\uB3D9</span><span class="tooltip-stat-value">${moveTypeKo(part.moveType)}</span></div>`

  return buildTooltipBody(part.name, 'legs', rows, moveRow, '', build, 'legs', partId, locked, ownedParts)
}

function buildBodyContent(partId: PartId, build: Build, locked: boolean, ownedParts: ReadonlySet<string> | undefined): string {
  const part = BODY_PARTS.find((p) => p.id === partId)
  if (!part) return ''

  const currentDerived = calculateBuildDerived(build)
  const candidateBuild = buildWithPart(build, 'body', partId)
  const candidateDerived = calculateBuildDerived(candidateBuild)

  const rows: StatRow[] = [
    { label: 'HP', current: currentDerived.core.hp, candidate: candidateDerived.core.hp },
    { label: '\uBC29\uC5B4', current: currentDerived.core.defense, candidate: candidateDerived.core.defense },
    { label: '\uC2DC\uC57C', current: currentDerived.core.sight, candidate: candidateDerived.core.sight },
    { label: '\uBB34\uAC8C', current: currentDerived.cost.weight, candidate: candidateDerived.cost.weight, lowerBetter: true },
  ]

  const mountRow = `<div class="tooltip-stat-row"><span class="tooltip-stat-label">\uC7A5\uCC29</span><span class="tooltip-stat-value">${part.mountType}</span></div>`

  return buildTooltipBody(part.name, 'body', rows, mountRow, '', build, 'body', partId, locked, ownedParts)
}

function buildWeaponContent(partId: PartId, build: Build, locked: boolean, ownedParts: ReadonlySet<string> | undefined): string {
  const part = WEAPON_PARTS.find((p) => p.id === partId)
  if (!part) return ''

  const currentDerived = calculateBuildDerived(build)
  const candidateBuild = buildWithPart(build, 'weapon', partId)
  const candidateDerived = calculateBuildDerived(candidateBuild)

  const rows: StatRow[] = [
    { label: '\uACF5\uACA9', current: currentDerived.core.attack, candidate: candidateDerived.core.attack },
    { label: '\uC0AC\uAC70\uB9AC', current: currentDerived.core.range, candidate: candidateDerived.core.range },
    { label: '\uC5F0\uC0AC', current: currentDerived.core.fireRate, candidate: candidateDerived.core.fireRate },
    { label: '\uBB34\uAC8C', current: currentDerived.cost.weight, candidate: candidateDerived.cost.weight, lowerBetter: true },
  ]

  const specialRow = `<div class="tooltip-special">\uD2B9\uC218: ${weaponSpecialDescKo(part.special)}</div>`
  const mountRow = `<div class="tooltip-stat-row"><span class="tooltip-stat-label">\uC7A5\uCC29</span><span class="tooltip-stat-value">${part.mountType}</span></div>`

  return buildTooltipBody(part.name, 'weapon', rows, mountRow, specialRow, build, 'weapon', partId, locked, ownedParts)
}

function buildAccessoryContent(partId: PartId | null, build: Build, locked: boolean, ownedParts: ReadonlySet<string> | undefined): string {
  if (!partId) {
    // "None" accessory
    const currentDerived = calculateBuildDerived(build)
    const candidateBuild = buildWithPart(build, 'accessory', null)
    const candidateDerived = calculateBuildDerived(candidateBuild)

    const rows: StatRow[] = [
      { label: '\uBB34\uAC8C', current: currentDerived.cost.weight, candidate: candidateDerived.cost.weight, lowerBetter: true },
      { label: '\uC640\uD2B8', current: currentDerived.cost.finalWattCost, candidate: candidateDerived.cost.finalWattCost, lowerBetter: true },
    ]

    return buildTooltipBody('\uC5C6\uC74C', 'accessory', rows, '', '', build, 'accessory', null, false, ownedParts)
  }

  const part = ACCESSORY_PARTS.find((p) => p.id === partId)
  if (!part) return ''

  const currentDerived = calculateBuildDerived(build)
  const candidateBuild = buildWithPart(build, 'accessory', partId)
  const candidateDerived = calculateBuildDerived(candidateBuild)

  const rows: StatRow[] = [
    { label: '\uBB34\uAC8C', current: currentDerived.cost.weight, candidate: candidateDerived.cost.weight, lowerBetter: true },
    { label: '\uC640\uD2B8', current: currentDerived.cost.finalWattCost, candidate: candidateDerived.cost.finalWattCost, lowerBetter: true },
  ]

  const effectRow = `<div class="tooltip-special">\uD6A8\uACFC: ${accessoryEffectDescKo(part.effect)}</div>`

  return buildTooltipBody(part.name, 'accessory', rows, '', effectRow, build, 'accessory', partId, locked, ownedParts)
}

function buildTooltipBody(
  name: string,
  category: PartCategory,
  rows: readonly StatRow[],
  extraRow: string,
  specialRow: string,
  build: Build,
  cat: PartCategory,
  partId: PartId | null,
  locked: boolean,
  _ownedParts: ReadonlySet<string> | undefined,
): string {
  const header = `<div class="part-tooltip-header"><span class="part-tooltip-category">${categoryIconKo(category)}</span><span class="part-tooltip-name">${name}</span></div>`

  let statsHtml = '<div class="part-tooltip-stats">'
  for (const row of rows) {
    const cur = typeof row.current === 'number' ? row.current : 0
    const cand = typeof row.candidate === 'number' ? row.candidate : 0
    const unit = row.unit ?? ''
    const lowerBetter = row.lowerBetter ?? false
    const deltaHtml = statDeltaHtml(cur, cand, unit, lowerBetter)

    statsHtml += `<div class="tooltip-stat-row"><span class="tooltip-stat-label">${row.label}</span><span class="tooltip-stat-value">${cand}${unit}</span>${deltaHtml}</div>`
  }
  if (extraRow) statsHtml += extraRow
  statsHtml += '</div>'

  // Synergy section
  const newSyns = findNewSynergiesForPart(build, cat, partId)
  let synergyHtml = ''
  if (newSyns.length > 0) {
    synergyHtml = '<div class="tooltip-synergy">'
    for (const syn of newSyns) {
      synergyHtml += `<div class="tooltip-synergy-item">\u26A1 ${syn.nameKo}: ${bonusTextKo(syn.bonus)}</div>`
    }
    synergyHtml += '</div>'
  }

  // Watt cost change
  const currentDerived = calculateBuildDerived(build)
  const candidateBuild = buildWithPart(build, cat, partId)
  const candidateDerived = calculateBuildDerived(candidateBuild)
  const wattDelta = candidateDerived.cost.finalWattCost - currentDerived.cost.finalWattCost
  let wattHtml = ''
  if (wattDelta !== 0 && category !== 'accessory') {
    // Accessory already shows watt in stats rows
    const sign = wattDelta > 0 ? '+' : ''
    const cls = wattDelta > 0 ? 'stat-down' : 'stat-up'
    wattHtml = `<div class="tooltip-watt">\uC640\uD2B8: <span class="${cls}">${sign}${wattDelta} \u25BC</span></div>`
  }

  // Bottom: locked info
  let bottomHtml = ''
  if (locked && partId) {
    const price = getPartPrice(partId)
    bottomHtml = `<div class="tooltip-locked">\uC0C1\uC810\uC5D0\uC11C \uAD6C\uB9E4 \uAC00\uB2A5 <span class="tooltip-price">${price} G</span></div>`
  }

  return header + statsHtml + specialRow + synergyHtml + wattHtml + bottomHtml
}

// ── Public API ─────────────────────────────────────────

export function showPartTooltip(
  target: HTMLElement,
  partId: PartId | null,
  category: PartCategory,
  currentBuild: Build,
  ownedParts?: ReadonlySet<string>,
): void {
  const tooltip = getTooltip()

  const locked = partId !== null && ownedParts !== undefined && !ownedParts.has(partId)

  let content: string
  switch (category) {
    case 'legs':
      if (!partId) return
      content = buildLegsContent(partId, currentBuild, locked, ownedParts)
      break
    case 'body':
      if (!partId) return
      content = buildBodyContent(partId, currentBuild, locked, ownedParts)
      break
    case 'weapon':
      if (!partId) return
      content = buildWeaponContent(partId, currentBuild, locked, ownedParts)
      break
    case 'accessory':
      content = buildAccessoryContent(partId, currentBuild, locked, ownedParts)
      break
  }

  tooltip.innerHTML = content
  tooltip.classList.add('part-tooltip-visible')

  // Position relative to the target
  positionTooltip(tooltip, target)
}

export function hidePartTooltip(): void {
  if (!tooltipEl) return
  tooltipEl.classList.remove('part-tooltip-visible')
}

function positionTooltip(tooltip: HTMLDivElement, target: HTMLElement): void {
  const rect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const gap = 8
  const viewportH = window.innerHeight
  const viewportW = window.innerWidth

  // Prefer placing above
  let top = rect.top - tooltipRect.height - gap
  if (top < 8) {
    // Place below instead
    top = rect.bottom + gap
  }
  // Clamp to not overflow bottom
  if (top + tooltipRect.height > viewportH - 8) {
    top = viewportH - tooltipRect.height - 8
  }

  // Center horizontally on target, clamp to viewport
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2
  if (left < 8) left = 8
  if (left + tooltipRect.width > viewportW - 8) {
    left = viewportW - tooltipRect.width - 8
  }

  tooltip.style.top = `${top}px`
  tooltip.style.left = `${left}px`
}

export function destroyPartTooltip(): void {
  if (tooltipEl) {
    tooltipEl.remove()
    tooltipEl = null
  }
}
