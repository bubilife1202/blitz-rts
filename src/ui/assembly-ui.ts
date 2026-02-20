import type {
  AccessoryId,
  BodyId,
  Build,
  LegsId,
  PartId,
  Roster,
  RosterIndex,
  SkillDeck,
  SkillName,
  SynergyBonusKind,
  WeaponId,
} from '../core/types'
import { calculateBuildDerived, validateBuild } from '../assembly/parts'
import { findSynergies } from '../assembly/synergy'
import { calculateDps } from '../combat/damage'
import {
  ACCESSORY_PARTS,
  BODY_PARTS,
  LEGS_PARTS,
  WEAPON_PARTS,
} from '../data/parts-data'
import { SKILLS } from '../data/skills-data'
import { renderMechSvg, renderPartSvg } from './mech-renderer'

export interface AssemblyResult {
  roster: Roster
  deck: SkillDeck
  ratios: [number, number, number]
}

export interface AssemblyUiCallbacks {
  onLaunch(result: AssemblyResult): void
}

type PartCategory = 'legs' | 'body' | 'weapon' | 'accessory'

const BUILD_LABELS = ['빌드 A', '빌드 B', '빌드 C'] as const

const DPS_TEST_DEFENSE = 10
const DPS_TEST_TARGET_MAXHP = 1000

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function categoryLabelKo(category: PartCategory): string {
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

function bonusTextKo(bonus: SynergyBonusKind): string {
  switch (bonus.kind) {
    case 'range-flat':
      return `사거리 +${bonus.value}`
    case 'fire-rate-flat':
      return `연사력 +${bonus.value}`
    case 'attack-percent':
      return `공격력 +${Math.round(bonus.value * 100)}%`
    case 'defense-aura':
      return `방어 오라 +${bonus.value} (반경 ${bonus.range})`
    case 'speed-damage':
      return `이속 비례 추가 대미지 ${Math.round(bonus.percent * 100)}%`
    case 'splash-range-flat':
      return `스플래시 범위 +${bonus.value}`
    case 'move-attack':
      return '이동 중 공격'
    case 'crit-chance':
      return `치명타 확률 +${Math.round(bonus.percent * 100)}%`
    case 'first-hit-multiplier':
      return `첫 타격 대미지 x${bonus.multiplier}`
  }
}

function deltaChipHtml(delta: number, unit = ''): string {
  if (!Number.isFinite(delta) || delta === 0) return ''
  const sign = delta > 0 ? '+' : ''
  const cls = delta > 0 ? 'delta-chip delta-plus' : 'delta-chip delta-minus'
  return `<span class="${cls}">${sign}${delta}${unit}</span>`
}

function loadFillClass(pct: number): 'green' | 'gold' | 'red' {
  if (pct >= 85) return 'red'
  if (pct >= 60) return 'gold'
  return 'green'
}

function findLegs(id: LegsId) {
  return LEGS_PARTS.find((p) => p.id === id)
}

function findBody(id: BodyId) {
  return BODY_PARTS.find((p) => p.id === id)
}

function findWeapon(id: WeaponId) {
  return WEAPON_PARTS.find((p) => p.id === id)
}

function findAccessory(id: AccessoryId) {
  return ACCESSORY_PARTS.find((p) => p.id === id)
}

export function createAssemblyUi(
  container: HTMLElement,
  callbacks: AssemblyUiCallbacks,
): { destroy(): void } {
  let activeIndex: RosterIndex = 0
  let activeCategory: PartCategory = 'legs'
  let hoverCandidate: { readonly category: PartCategory; readonly partId: PartId | null } | null = null

  let roster: [Build, Build, Build] = [
    { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
    { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
    { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
  ]

  let selectedSkills: SkillName[] = []
  let ratios: [number, number, number] = [3, 1, 1]
  let mechPreviewEl: HTMLDivElement | null = null

  const screen = document.createElement('div')
  screen.className = 'screen'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const topbar = document.createElement('div')
  topbar.className = 'topbar'

  const buildTabs = document.createElement('div')
  buildTabs.className = 'tabs'
  buildTabs.setAttribute('data-tutorial', 'build-tabs')

  const tabButtons: HTMLButtonElement[] = []
  for (let i = 0; i < 3; i++) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tab'
    btn.textContent = BUILD_LABELS[i]
    btn.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false')
    btn.addEventListener('click', () => {
      activeIndex = i as RosterIndex
      hoverCandidate = null
      renderAll()
    })
    tabButtons.push(btn)
    buildTabs.appendChild(btn)
  }

  const rightMeta = document.createElement('div')
  rightMeta.className = 'meta'
  const modePill = document.createElement('span')
  modePill.className = 'pill mono'
  modePill.textContent = 'MECH BLUEPRINT WORKSHOP'
  rightMeta.appendChild(modePill)

  topbar.appendChild(buildTabs)
  topbar.appendChild(rightMeta)

  const layout = document.createElement('div')
  layout.className = 'assembly-layout'

  const left = document.createElement('div')
  left.className = 'assembly-left'
  const center = document.createElement('div')
  center.className = 'assembly-center'
  const right = document.createElement('div')
  right.className = 'assembly-right'

  const partsPanel = document.createElement('div')
  partsPanel.className = 'panel'
  partsPanel.setAttribute('data-tutorial', 'parts-panel')
  partsPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">파츠</h2>
      <div class="muted">슬롯을 클릭하면 카테고리가 활성화됩니다</div>
    </div>
    <div class="panel-body" data-role="parts-body"></div>
  `
  const partsBody = partsPanel.querySelector<HTMLDivElement>('[data-role="parts-body"]')
  if (!partsBody) throw new Error('Missing parts panel body')

  const categoryTabs = document.createElement('div')
  categoryTabs.className = 'category-tabs'
  const categoryButtons: Array<{ readonly category: PartCategory; readonly el: HTMLButtonElement }> = []
  for (const cat of ['legs', 'body', 'weapon', 'accessory'] as const) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tab'
    btn.textContent = categoryLabelKo(cat)
    btn.setAttribute('aria-pressed', cat === activeCategory ? 'true' : 'false')
    btn.addEventListener('click', () => {
      activeCategory = cat
      hoverCandidate = null
      renderAll()
    })
    categoryButtons.push({ category: cat, el: btn })
    categoryTabs.appendChild(btn)
  }

  const partsList = document.createElement('div')
  partsList.className = 'grid'

  partsBody.appendChild(categoryTabs)
  partsBody.appendChild(partsList)
  left.appendChild(partsPanel)

  const blueprintPanel = document.createElement('div')
  blueprintPanel.className = 'panel'
  blueprintPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">조립</h2>
      <div class="muted">중앙 슬롯: 다리/몸체/무기/보조</div>
    </div>
    <div class="panel-body">
      <div class="bp-stage" data-role="bp-stage"></div>
    </div>
  `
  const bpStageEl0 = blueprintPanel.querySelector<HTMLDivElement>('[data-role="bp-stage"]')
  if (!bpStageEl0) throw new Error('Missing blueprint stage')
  const bpStageEl: HTMLDivElement = bpStageEl0
  center.appendChild(blueprintPanel)

  const statsPanel = document.createElement('div')
  statsPanel.className = 'panel'
  statsPanel.setAttribute('data-tutorial', 'stats-panel')
  statsPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">스탯</h2>
      <div class="muted">호버: 변화량 비교</div>
    </div>
    <div class="panel-body" data-role="stats"></div>
  `
  const statsBodyEl0 = statsPanel.querySelector<HTMLDivElement>('[data-role="stats"]')
  if (!statsBodyEl0) throw new Error('Missing stats body')
  const statsBodyEl: HTMLDivElement = statsBodyEl0

  const errorsPanel = document.createElement('div')
  errorsPanel.className = 'panel'
  errorsPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">합산</h2>
      <div class="muted">빌드 상태</div>
    </div>
    <div class="panel-body" data-role="errors"></div>
  `
  const errorsBodyEl0 = errorsPanel.querySelector<HTMLDivElement>('[data-role="errors"]')
  if (!errorsBodyEl0) throw new Error('Missing errors body')
  const errorsBodyEl: HTMLDivElement = errorsBodyEl0

  const synergyPanel = document.createElement('div')
  synergyPanel.className = 'panel'
  synergyPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">시너지</h2>
      <div class="muted">조건 충족 시 표시</div>
    </div>
    <div class="panel-body" data-role="syn"></div>
  `
  const synBodyEl0 = synergyPanel.querySelector<HTMLDivElement>('[data-role="syn"]')
  if (!synBodyEl0) throw new Error('Missing synergy body')
  const synBodyEl: HTMLDivElement = synBodyEl0

  right.appendChild(statsPanel)
  right.appendChild(errorsPanel)
  right.appendChild(synergyPanel)

  const bottomPanel = document.createElement('div')
  bottomPanel.className = 'panel assembly-bottom'
  bottomPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">준비</h2>
      <div class="muted">스킬 선택 · 생산 비율 · 출격</div>
    </div>
    <div class="panel-body" data-role="bottom"></div>
  `
  const bottomBody = bottomPanel.querySelector<HTMLDivElement>('[data-role="bottom"]')
  if (!bottomBody) throw new Error('Missing bottom body')

  const skillsPanel = document.createElement('div')
  skillsPanel.className = 'grid'
  skillsPanel.innerHTML = `<div class="muted">스킬 선택 (3개)</div>`
  const skillGrid = document.createElement('div')
  skillGrid.className = 'skill-grid'
  skillGrid.setAttribute('data-tutorial', 'skill-grid')
  skillsPanel.appendChild(skillGrid)

  const ratiosPanel = document.createElement('div')
  ratiosPanel.className = 'grid'
  ratiosPanel.innerHTML = `<div class="muted">생산 비율</div>`
  const ratioRows = document.createElement('div')
  ratioRows.className = 'grid'
  ratiosPanel.appendChild(ratioRows)

  const launchRow = document.createElement('div')
  launchRow.className = 'launch-row'
  const launchHint = document.createElement('div')
  launchHint.className = 'muted'
  const launchBtn = document.createElement('button')
  launchBtn.type = 'button'
  launchBtn.className = 'btn btn-primary btn-xl'
  launchBtn.setAttribute('data-tutorial', 'launch-button')
  launchBtn.textContent = '출격'
  launchRow.appendChild(launchHint)
  launchRow.appendChild(launchBtn)

  bottomBody.appendChild(skillsPanel)
  bottomBody.appendChild(ratiosPanel)
  bottomBody.appendChild(launchRow)

  layout.appendChild(left)
  layout.appendChild(center)
  layout.appendChild(right)
  layout.appendChild(bottomPanel)

  screen.appendChild(title)
  screen.appendChild(topbar)
  screen.appendChild(layout)
  container.replaceChildren(screen)

  function setBuild(update: (prev: Build) => Build): void {
    const current = roster[activeIndex]
    roster = roster.map((b, idx) => {
      if (idx !== activeIndex) return b
      return update(current)
    }) as [Build, Build, Build]
  }

  function buildWithCandidate(build: Build, candidate: typeof hoverCandidate): Build {
    if (!candidate) return build
    if (candidate.category === 'legs') {
      if (!candidate.partId) return build
      return { ...build, legsId: candidate.partId as LegsId }
    }
    if (candidate.category === 'body') {
      if (!candidate.partId) return build
      return { ...build, bodyId: candidate.partId as BodyId }
    }
    if (candidate.category === 'weapon') {
      if (!candidate.partId) return build
      return { ...build, weaponId: candidate.partId as WeaponId }
    }
    return { ...build, accessoryId: candidate.partId as AccessoryId | null }
  }

  function renderParts(): void {
    for (const t of categoryButtons) {
      t.el.setAttribute('aria-pressed', t.category === activeCategory ? 'true' : 'false')
    }

    const build = roster[activeIndex]
    const body = findBody(build.bodyId)
    const weapon = findWeapon(build.weaponId)
    const bodyMount = body?.mountType ?? null
    const weaponMount = weapon?.mountType ?? null
    const mountMismatch =
      bodyMount !== null && weaponMount !== null && bodyMount !== weaponMount

    partsList.innerHTML = ''

    if (mountMismatch) {
      const warn = document.createElement('div')
      warn.className = 'error-item'
      warn.textContent = '몸체/무기 장착 타입이 맞지 않습니다.'
      partsList.appendChild(warn)
    }

    const makePartButton = (params: {
      readonly title: string
      readonly sub: string
      readonly selected: boolean
      readonly disabled: boolean
      readonly onPick: () => void
      readonly onHover: (active: boolean) => void
    }): HTMLButtonElement => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'card slot-btn'
      if (params.selected) btn.classList.add('card-selected')
      if (params.disabled) btn.classList.add('card-disabled')
      btn.disabled = params.disabled
      btn.innerHTML = `
        <div class="card-title">${params.title} ${params.selected ? '<span class="equipped-mark">[E]</span>' : ''}</div>
        <div class="card-sub mono">${params.sub}</div>
      `
      btn.addEventListener('click', () => {
        if (params.disabled) return
        params.onPick()
        hoverCandidate = null
        renderAll()
      })
      btn.addEventListener('mouseenter', () => params.onHover(true))
      btn.addEventListener('mouseleave', () => params.onHover(false))
      return btn
    }

    if (activeCategory === 'legs') {
      for (const p of LEGS_PARTS) {
        const selected = p.id === build.legsId
        const sub = `이동:${p.moveType}  속도:${p.speed}  적재:${p.loadCapacity}`
        partsList.appendChild(
          makePartButton({
            title: p.name,
            sub,
            selected,
            disabled: false,
            onPick: () => setBuild((prev) => ({ ...prev, legsId: p.id })),
            onHover: (active) => {
              hoverCandidate = active ? { category: 'legs', partId: p.id } : null
              renderStats()
              updateMechPreview()
            },
          }),
        )
      }
      return
    }

    if (activeCategory === 'body') {
      for (const p of BODY_PARTS) {
        const selected = p.id === build.bodyId
        const disabled = weaponMount !== null && p.mountType !== weaponMount
        const sub = `장착:${p.mountType}  HP:${p.hp}  DEF:${p.defense}  WT:${p.weight}`
        partsList.appendChild(
          makePartButton({
            title: p.name,
            sub,
            selected,
            disabled,
            onPick: () => setBuild((prev) => ({ ...prev, bodyId: p.id })),
            onHover: (active) => {
              hoverCandidate = active ? { category: 'body', partId: p.id } : null
              renderStats()
              updateMechPreview()
            },
          }),
        )
      }
      return
    }

    if (activeCategory === 'weapon') {
      for (const p of WEAPON_PARTS) {
        const selected = p.id === build.weaponId
        const disabled = bodyMount !== null && p.mountType !== bodyMount
        const sub = `장착:${p.mountType}  ATK:${p.attack}  R:${p.range}  FR:${p.fireRate}  WT:${p.weight}`
        partsList.appendChild(
          makePartButton({
            title: p.name,
            sub,
            selected,
            disabled,
            onPick: () => setBuild((prev) => ({ ...prev, weaponId: p.id })),
            onHover: (active) => {
              hoverCandidate = active ? { category: 'weapon', partId: p.id } : null
              renderStats()
              updateMechPreview()
            },
          }),
        )
      }
      return
    }

    partsList.appendChild(
      makePartButton({
        title: '없음',
        sub: '—',
        selected: build.accessoryId === null,
        disabled: false,
        onPick: () => setBuild((prev) => ({ ...prev, accessoryId: null })),
        onHover: (active) => {
          hoverCandidate = active ? { category: 'accessory', partId: null } : null
          renderStats()
          updateMechPreview()
        },
      }),
    )

    for (const p of ACCESSORY_PARTS) {
      const selected = p.id === build.accessoryId
      const sub = `WT:${p.weight}  효과:${p.effect.kind}`
      partsList.appendChild(
        makePartButton({
          title: p.name,
          sub,
          selected,
          disabled: false,
          onPick: () => setBuild((prev) => ({ ...prev, accessoryId: p.id })),
          onHover: (active) => {
            hoverCandidate = active ? { category: 'accessory', partId: p.id } : null
            renderStats()
            updateMechPreview()
          },
        }),
      )
    }
  }

  function slotButton(category: PartCategory, label: string, partName: string, partSvgHtml: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mech-slot'
    btn.setAttribute('aria-current', category === activeCategory ? 'true' : 'false')
    btn.innerHTML = `
      <div class="mech-slot-svg">${partSvgHtml}</div>
      <div style="position:absolute; left:10px; top:10px; right:10px; display:flex; justify-content:space-between; gap:10px; align-items:baseline; pointer-events:none;">
        <span class="mono" style="opacity:0.8; font-size:11px">${label}</span>
        <span class="mono" style="opacity:0.9; font-size:11px">${partName}</span>
      </div>
    `
    btn.addEventListener('click', () => {
      activeCategory = category
      hoverCandidate = null
      renderAll()
    })
    return btn
  }

  function renderBlueprint(): void {
    const build = roster[activeIndex]
    const candidateBuild = buildWithCandidate(build, hoverCandidate)

    const legs = findLegs(build.legsId)
    const body = findBody(build.bodyId)
    const weapon = findWeapon(build.weaponId)
    const accessory = build.accessoryId ? findAccessory(build.accessoryId) : null

    const legsSvg = renderPartSvg('legs', build.legsId, 48)
    const bodySvg = renderPartSvg('body', build.bodyId, 48)
    const weaponSvg = renderPartSvg('weapon', build.weaponId, 48)
    const accessorySvg = build.accessoryId
      ? renderPartSvg('accessory', build.accessoryId, 48)
      : ''

    const mech = document.createElement('div')
    mech.className = 'mech'

    const accBtn = slotButton('accessory', '보조', accessory?.name ?? '없음', accessorySvg)
    const bodyBtn = slotButton('body', '몸체', body?.name ?? '—', bodySvg)
    const weaponBtn = slotButton('weapon', '무기', weapon?.name ?? '—', weaponSvg)
    const legsBtn = slotButton('legs', '다리', legs?.name ?? '—', legsSvg)

    const conn1 = document.createElement('div')
    conn1.className = 'mech-connector bottom'
    accBtn.appendChild(conn1)
    const conn2 = document.createElement('div')
    conn2.className = 'mech-connector bottom'
    bodyBtn.appendChild(conn2)
    const conn3 = document.createElement('div')
    conn3.className = 'mech-connector bottom'
    weaponBtn.appendChild(conn3)

    mech.appendChild(accBtn)
    mech.appendChild(bodyBtn)
    mech.appendChild(weaponBtn)
    mech.appendChild(legsBtn)

    const preview = document.createElement('div')
    preview.className = 'bp-mech-preview'
    preview.innerHTML = renderMechSvg(candidateBuild, 110)
    mechPreviewEl = preview
    bpStageEl.replaceChildren(preview, mech)
  }

  function updateMechPreview(): void {
    if (!mechPreviewEl) return
    const build = roster[activeIndex]
    const candidateBuild = buildWithCandidate(build, hoverCandidate)
    mechPreviewEl.innerHTML = renderMechSvg(candidateBuild, 110)
  }

  function renderStats(): void {
    const build = roster[activeIndex]
    const derived = calculateBuildDerived(build)
    const candidateBuild = buildWithCandidate(build, hoverCandidate)
    const candidateDerived = hoverCandidate ? calculateBuildDerived(candidateBuild) : null

    const dps = calculateDps({
      attack: derived.core.attack,
      fireRate: derived.core.fireRate,
      targetDefense: DPS_TEST_DEFENSE,
      targetMaxHp: DPS_TEST_TARGET_MAXHP,
      special: derived.core.weaponSpecial,
    })

    const delta = (v: number, next: number | null): number => (next === null ? 0 : next - v)

    const hpDelta = delta(derived.core.hp, candidateDerived?.core.hp ?? null)
    const defDelta = delta(derived.core.defense, candidateDerived?.core.defense ?? null)
    const atkDelta = delta(derived.core.attack, candidateDerived?.core.attack ?? null)
    const spdDelta = delta(derived.core.speed, candidateDerived?.core.speed ?? null)
    const sightDelta = delta(derived.core.sight, candidateDerived?.core.sight ?? null)
    const rangeDelta = delta(derived.core.range, candidateDerived?.core.range ?? null)
    const frDelta = delta(derived.core.fireRate, candidateDerived?.core.fireRate ?? null)
    const wtDelta = delta(derived.cost.weight, candidateDerived?.cost.weight ?? null)
    const costDelta = delta(derived.cost.finalWattCost, candidateDerived?.cost.finalWattCost ?? null)

    const used = derived.cost.weight
    const cap = Math.max(1, derived.core.loadCapacity)
    const usedPct = Math.min(200, Math.max(0, (used / cap) * 100))
    const fill = loadFillClass(usedPct)

    statsBodyEl.innerHTML = `
      <div class="muted">
        <span class="mono">${derived.core.moveType}</span> · <span class="mono">${derived.core.mountType}</span>
      </div>

      <div class="load-bar" style="margin-top:10px">
        <div class="load-label"><span>적재량</span><span>${used} / ${derived.core.loadCapacity}</span></div>
        <div class="load-track"><div class="load-fill ${fill === 'gold' ? 'gold' : fill === 'red' ? 'red' : ''}" style="width:${Math.min(100, usedPct)}%"></div></div>
        <div class="muted mono" style="font-size:11px">${Math.round(usedPct)}%</div>
      </div>

      <table class="stat-table" style="margin-top:12px">
        <tbody>
          <tr><td>HP</td><td>${derived.core.hp} ${deltaChipHtml(hpDelta)}</td></tr>
          <tr><td>방어</td><td>${derived.core.defense} ${deltaChipHtml(defDelta)}</td></tr>
          <tr><td>공격</td><td>${derived.core.attack} ${deltaChipHtml(atkDelta)}</td></tr>
          <tr><td>속도</td><td>${derived.core.speed} ${deltaChipHtml(spdDelta)}</td></tr>
          <tr><td>시야</td><td>${derived.core.sight} ${deltaChipHtml(sightDelta)}</td></tr>
          <tr><td>사거리</td><td>${derived.core.range} ${deltaChipHtml(rangeDelta)}</td></tr>
          <tr><td>연사</td><td>${derived.core.fireRate} ${deltaChipHtml(frDelta)}</td></tr>
          <tr><td>무게</td><td>${derived.cost.weight} ${deltaChipHtml(wtDelta)}</td></tr>
          <tr><td>와트</td><td>${derived.cost.finalWattCost} ${deltaChipHtml(costDelta)}</td></tr>
          <tr><td>DPS</td><td>${Math.round(dps)}</td></tr>
        </tbody>
      </table>
    `
  }

  function renderSynergies(): void {
    const build = roster[activeIndex]
    const syns = findSynergies(build)

    if (syns.length === 0) {
      synBodyEl.innerHTML = `<div class="muted">시너지 없음</div>`
      return
    }

    const wrap = document.createElement('div')
    wrap.className = 'synergy-badges'
    for (const s of syns) {
      const el = document.createElement('div')
      el.className = 'synergy'
      el.innerHTML = `<span class="synergy-name">${s.nameKo}</span><span class="synergy-bonus">${bonusTextKo(s.bonus)}</span>`
      wrap.appendChild(el)
    }
    synBodyEl.replaceChildren(wrap)
  }

  function renderValidation(): { readonly allBuildsOk: boolean } {
    const build = roster[activeIndex]
    const validation = validateBuild(build)

    errorsBodyEl.innerHTML = ''
    const header = document.createElement('div')
    header.className = 'muted'
    const accessory = build.accessoryId ? findAccessory(build.accessoryId) : null
    const legs = findLegs(build.legsId)
    const body = findBody(build.bodyId)
    const weapon = findWeapon(build.weaponId)
    header.textContent = `${legs?.name ?? '—'} / ${body?.name ?? '—'} / ${weapon?.name ?? '—'} / ${accessory?.name ?? '없음'}`
    errorsBodyEl.appendChild(header)

    if (!validation.ok) {
      const list = document.createElement('div')
      list.className = 'errors'
      for (const err of validation.errors) {
        const item = document.createElement('div')
        item.className = 'error-item'
        item.textContent = err.message
        list.appendChild(item)
      }
      errorsBodyEl.appendChild(list)
    } else {
      const ok = document.createElement('div')
      ok.className = 'muted'
      ok.textContent = 'OK'
      errorsBodyEl.appendChild(ok)
    }

    let allBuildsOk = true
    for (const b of roster) {
      if (!validateBuild(b).ok) {
        allBuildsOk = false
        break
      }
    }
    return { allBuildsOk }
  }

  function renderSkills(): void {
    skillGrid.innerHTML = ''
    for (const def of SKILLS) {
      const pressed = selectedSkills.includes(def.name)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'card skill-toggle'
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false')
      btn.innerHTML = `
        <div class="card-title">${def.name}</div>
        <div class="skill-meta"><span>SP ${def.spCost}</span><span>CD ${def.cooldownSeconds}s</span></div>
      `
      btn.addEventListener('click', () => {
        const isSelected = selectedSkills.includes(def.name)
        if (isSelected) {
          selectedSkills = selectedSkills.filter((s) => s !== def.name)
        } else {
          if (selectedSkills.length >= 3) return
          selectedSkills = [...selectedSkills, def.name]
        }
        renderAll()
      })
      skillGrid.appendChild(btn)
    }
  }

  function renderRatios(): void {
    ratioRows.innerHTML = ''
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div')
      row.className = 'form-row'

      const label = document.createElement('div')
      label.className = 'muted'
      label.textContent = BUILD_LABELS[i]

      const right = document.createElement('div')
      right.style.display = 'grid'
      right.style.gridTemplateColumns = '160px 44px'
      right.style.alignItems = 'center'
      right.style.gap = '10px'

      const slider = document.createElement('input')
      slider.className = 'range-input'
      slider.type = 'range'
      slider.min = '0'
      slider.max = '9'
      slider.step = '1'
      slider.value = String(ratios[i])

      const value = document.createElement('div')
      value.className = 'mono'
      value.textContent = String(ratios[i])

      slider.addEventListener('input', () => {
        const n = clampInt(Number(slider.value), 0, 9)
        ratios = ratios.map((v, idx) => (idx === i ? n : v)) as [number, number, number]
        value.textContent = String(ratios[i])
      })

      right.appendChild(slider)
      right.appendChild(value)

      row.appendChild(label)
      row.appendChild(right)
      ratioRows.appendChild(row)
    }
  }

  function canLaunch(allBuildsOk: boolean): boolean {
    return allBuildsOk && selectedSkills.length === 3
  }

  function renderAll(): void {
    for (let i = 0; i < tabButtons.length; i++) {
      tabButtons[i]!.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false')
    }

    renderParts()
    renderBlueprint()
    renderStats()
    renderSynergies()
    const { allBuildsOk } = renderValidation()
    renderSkills()
    renderRatios()

    const ok = canLaunch(allBuildsOk)
    launchBtn.disabled = !ok
    if (ok) {
      launchHint.textContent = `스킬 ${selectedSkills.length}/3 · 준비 완료`
    } else {
      launchHint.textContent = `스킬 ${selectedSkills.length}/3 · 빌드 미완성`
    }
  }

  launchBtn.addEventListener('click', () => {
    const allOk = roster.every((b) => validateBuild(b).ok)
    if (!allOk) return
    if (selectedSkills.length !== 3) return

    const deck = [
      selectedSkills[0]!,
      selectedSkills[1]!,
      selectedSkills[2]!,
    ] as const satisfies readonly SkillName[]

    callbacks.onLaunch({
      roster,
      deck: deck as SkillDeck,
      ratios,
    })
  })

  renderAll()

  return {
    destroy(): void {
      screen.remove()
    },
  }
}
