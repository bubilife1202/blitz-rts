import type {
  AccessoryId,
  BodyId,
  Build,
  LegsId,
  Roster,
  RosterIndex,
  SkillDeck,
  SkillName,
  WeaponId,
} from '../core/types'
import { calculateBuildDerived, validateBuild } from '../assembly/parts'
import { calculateDps } from '../combat/damage'
import {
  ACCESSORY_PARTS,
  BODY_PARTS,
  LEGS_PARTS,
  WEAPON_PARTS,
} from '../data/parts-data'
import { SKILLS } from '../data/skills-data'

export interface AssemblyResult {
  roster: Roster
  deck: SkillDeck
  ratios: [number, number, number]
}

export interface AssemblyUiCallbacks {
  onLaunch(result: AssemblyResult): void
}

type PartCategory = 'legs' | 'body' | 'weapon' | 'accessory'

const BUILD_LABELS = ['Build A', 'Build B', 'Build C'] as const
const DPS_TEST_DEFENSE = 10
const DPS_TEST_TARGET_MAXHP = 1000

function findLegs(id: LegsId) {
  return LEGS_PARTS.find(p => p.id === id)
}

function findBody(id: BodyId) {
  return BODY_PARTS.find(p => p.id === id)
}

function findWeapon(id: WeaponId) {
  return WEAPON_PARTS.find(p => p.id === id)
}

function findAccessory(id: AccessoryId) {
  return ACCESSORY_PARTS.find(p => p.id === id)
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function createPanel(title: string): { root: HTMLDivElement; body: HTMLDivElement } {
  const root = document.createElement('div')
  root.className = 'panel'
  const header = document.createElement('div')
  header.className = 'panel-header'
  const h = document.createElement('h2')
  h.className = 'panel-title'
  h.textContent = title
  header.appendChild(h)
  const body = document.createElement('div')
  body.className = 'panel-body'
  root.appendChild(header)
  root.appendChild(body)
  return { root, body }
}

export function createAssemblyUi(
  container: HTMLElement,
  callbacks: AssemblyUiCallbacks,
): { destroy(): void } {
  let activeIndex: RosterIndex = 0
  let roster: [Build, Build, Build] = [
    { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
    { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
    { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
  ]

  let selectedSkills: SkillName[] = []
  let ratios: [number, number, number] = [3, 1, 1]

  const screen = document.createElement('div')
  screen.className = 'screen'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const topbar = document.createElement('div')
  topbar.className = 'topbar'
  const tabs = document.createElement('div')
  tabs.className = 'tabs'

  const tabButtons: HTMLButtonElement[] = []
  for (let i = 0; i < 3; i++) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tab'
    btn.textContent = BUILD_LABELS[i]
    btn.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false')
    btn.addEventListener('click', () => {
      activeIndex = i as RosterIndex
      renderAll()
    })
    tabButtons.push(btn)
    tabs.appendChild(btn)
  }

  topbar.appendChild(tabs)
  screen.appendChild(title)
  screen.appendChild(topbar)

  const layout = document.createElement('div')
  layout.className = 'assembly-layout'

  const left = document.createElement('div')
  left.className = 'assembly-left'
  const right = document.createElement('div')
  right.className = 'assembly-right'

  const partsPanel = createPanel('PARTS')
  const legsPanel = createPanel('LEGS')
  const bodyPanel = createPanel('BODY')
  const weaponPanel = createPanel('WEAPON')
  const accessoryPanel = createPanel('ACCESSORY')

  const partsGrid = document.createElement('div')
  partsGrid.className = 'grid'
  partsGrid.appendChild(legsPanel.root)
  partsGrid.appendChild(bodyPanel.root)
  partsGrid.appendChild(weaponPanel.root)
  partsGrid.appendChild(accessoryPanel.root)
  partsPanel.body.appendChild(partsGrid)
  left.appendChild(partsPanel.root)

  const statsPanel = createPanel('STATS')
  const statsRoot = document.createElement('div')
  statsRoot.className = 'grid'
  statsPanel.body.appendChild(statsRoot)

  const errorsPanel = createPanel('VALIDATION')
  const errorsRoot = document.createElement('div')
  errorsRoot.className = 'errors'
  errorsPanel.body.appendChild(errorsRoot)

  const skillsPanel = createPanel('SKILL DECK (Pick 3)')
  const skillGrid = document.createElement('div')
  skillGrid.className = 'skill-grid'
  skillsPanel.body.appendChild(skillGrid)

  const ratiosPanel = createPanel('PRODUCTION RATIOS')
  const ratioRows = document.createElement('div')
  ratioRows.className = 'grid'
  ratiosPanel.body.appendChild(ratioRows)

  const launchPanel = createPanel('LAUNCH')
  const launchRow = document.createElement('div')
  launchRow.className = 'launch-row'
  const launchBtn = document.createElement('button')
  launchBtn.type = 'button'
  launchBtn.className = 'btn btn-primary'
  launchBtn.textContent = '전투 시작'
  const launchHint = document.createElement('div')
  launchHint.className = 'muted'
  launchHint.textContent = '빌드 3개 + 스킬 3개 필요'
  launchRow.appendChild(launchHint)
  launchRow.appendChild(launchBtn)
  launchPanel.body.appendChild(launchRow)

  right.appendChild(statsPanel.root)
  right.appendChild(errorsPanel.root)
  right.appendChild(skillsPanel.root)
  right.appendChild(ratiosPanel.root)
  right.appendChild(launchPanel.root)

  layout.appendChild(left)
  layout.appendChild(right)
  screen.appendChild(layout)
  container.replaceChildren(screen)

  function setBuild(update: (prev: Build) => Build): void {
    const current = roster[activeIndex]
    roster = roster.map((b, idx) => {
      if (idx !== activeIndex) return b
      return update(current)
    }) as [Build, Build, Build]
  }

  function renderPartCards(category: PartCategory): void {
    const build = roster[activeIndex]

    const body = findBody(build.bodyId)
    const weapon = findWeapon(build.weaponId)
    const bodyMount = body?.mountType ?? null
    const weaponMount = weapon?.mountType ?? null

    const mountMismatch =
      bodyMount !== null && weaponMount !== null && bodyMount !== weaponMount

    const makeCard = (params: {
      readonly title: string
      readonly sub: string
      readonly selected: boolean
      readonly disabled: boolean
      readonly onPick: () => void
    }): HTMLButtonElement => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'card'
      if (params.selected) btn.classList.add('card-selected')
      if (params.disabled) btn.classList.add('card-disabled')
      btn.disabled = params.disabled
      btn.innerHTML = `
        <div class="card-title">${params.title}</div>
        <div class="card-sub mono">${params.sub}</div>
      `
      btn.addEventListener('click', () => {
        if (params.disabled) return
        params.onPick()
        renderAll()
      })
      return btn
    }

    if (category === 'legs') {
      legsPanel.body.innerHTML = ''
      const grid = document.createElement('div')
      grid.className = 'card-grid'
      for (const p of LEGS_PARTS) {
        const selected = p.id === build.legsId
        const sub = `move:${p.moveType}  spd:${p.speed}  load:${p.loadCapacity}`
        grid.appendChild(
          makeCard({
            title: p.name,
            sub,
            selected,
            disabled: false,
            onPick: () => {
              setBuild(prev => ({ ...prev, legsId: p.id }))
            },
          }),
        )
      }
      legsPanel.body.appendChild(grid)
      return
    }

    if (category === 'body') {
      bodyPanel.body.innerHTML = ''
      const grid = document.createElement('div')
      grid.className = 'card-grid'
      for (const p of BODY_PARTS) {
        const selected = p.id === build.bodyId
        const disabled = weaponMount !== null && p.mountType !== weaponMount
        const sub = `mnt:${p.mountType}  hp:${p.hp}  def:${p.defense}  wt:${p.weight}`
        grid.appendChild(
          makeCard({
            title: p.name,
            sub,
            selected,
            disabled,
            onPick: () => {
              setBuild(prev => ({ ...prev, bodyId: p.id }))
            },
          }),
        )
      }
      bodyPanel.body.appendChild(grid)

      if (mountMismatch) {
        const hint = document.createElement('div')
        hint.className = 'muted'
        hint.textContent = 'Body/Weapon mountType 불일치'
        bodyPanel.body.appendChild(hint)
      }
      return
    }

    if (category === 'weapon') {
      weaponPanel.body.innerHTML = ''
      const grid = document.createElement('div')
      grid.className = 'card-grid'
      for (const p of WEAPON_PARTS) {
        const selected = p.id === build.weaponId
        const disabled = bodyMount !== null && p.mountType !== bodyMount
        const sub = `mnt:${p.mountType}  atk:${p.attack}  r:${p.range}  fr:${p.fireRate}  wt:${p.weight}`
        grid.appendChild(
          makeCard({
            title: p.name,
            sub,
            selected,
            disabled,
            onPick: () => {
              setBuild(prev => ({ ...prev, weaponId: p.id }))
            },
          }),
        )
      }
      weaponPanel.body.appendChild(grid)

      if (mountMismatch) {
        const hint = document.createElement('div')
        hint.className = 'muted'
        hint.textContent = 'Body/Weapon mountType 불일치'
        weaponPanel.body.appendChild(hint)
      }
      return
    }

    accessoryPanel.body.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'card-grid'
    const noneSelected = build.accessoryId === null
    grid.appendChild(
      makeCard({
        title: 'None',
        sub: '—',
        selected: noneSelected,
        disabled: false,
        onPick: () => {
          setBuild(prev => ({ ...prev, accessoryId: null }))
        },
      }),
    )
    for (const p of ACCESSORY_PARTS) {
      const selected = p.id === build.accessoryId
      const sub = `wt:${p.weight}  fx:${p.effect.kind}`
      grid.appendChild(
        makeCard({
          title: p.name,
          sub,
          selected,
          disabled: false,
          onPick: () => {
            setBuild(prev => ({ ...prev, accessoryId: p.id }))
          },
        }),
      )
    }
    accessoryPanel.body.appendChild(grid)
  }

  function renderStatsAndErrors(): { readonly allBuildsOk: boolean } {
    const build = roster[activeIndex]
    const derived = calculateBuildDerived(build)
    const validation = validateBuild(build)

    const legs = findLegs(build.legsId)
    const body = findBody(build.bodyId)
    const weapon = findWeapon(build.weaponId)
    const accessory = build.accessoryId ? findAccessory(build.accessoryId) : null

    const dps = calculateDps({
      attack: derived.core.attack,
      fireRate: derived.core.fireRate,
      targetDefense: DPS_TEST_DEFENSE,
      targetMaxHp: DPS_TEST_TARGET_MAXHP,
      special: derived.core.weaponSpecial,
    })

    statsRoot.innerHTML = ''

    const summary = document.createElement('div')
    summary.className = 'muted'
    summary.textContent =
      `${legs?.name ?? '—'} / ${body?.name ?? '—'} / ${weapon?.name ?? '—'} / ${accessory?.name ?? 'None'}`
    statsRoot.appendChild(summary)

    const weightOk = derived.cost.weight <= derived.core.loadCapacity
    const weightRow = document.createElement('div')
    weightRow.className = `mono ${weightOk ? 'stat-good' : 'stat-bad'}`
    weightRow.textContent = `Weight ${derived.cost.weight} / Load ${derived.core.loadCapacity}`
    statsRoot.appendChild(weightRow)

    const wattRow = document.createElement('div')
    wattRow.className = 'mono'
    wattRow.textContent = `Watt ${derived.cost.wattTier}  Cost ${derived.cost.finalWattCost}`
    statsRoot.appendChild(wattRow)

    const table = document.createElement('table')
    table.className = 'stat-table'
    table.innerHTML = `
      <tbody>
        <tr><td>Attack</td><td>${derived.core.attack}</td></tr>
        <tr><td>Defense</td><td>${derived.core.defense}</td></tr>
        <tr><td>HP</td><td>${derived.core.hp}</td></tr>
        <tr><td>Speed</td><td>${derived.core.speed}</td></tr>
        <tr><td>Range</td><td>${derived.core.range}</td></tr>
        <tr><td>FireRate</td><td>${derived.core.fireRate}</td></tr>
        <tr><td>DPS (def ${DPS_TEST_DEFENSE})</td><td>${Math.round(dps)}</td></tr>
      </tbody>
    `
    statsRoot.appendChild(table)

    errorsRoot.innerHTML = ''
    if (!validation.ok) {
      for (const err of validation.errors) {
        const div = document.createElement('div')
        div.className = 'error-item'
        div.textContent = err.message
        errorsRoot.appendChild(div)
      }
    } else {
      const div = document.createElement('div')
      div.className = 'muted'
      div.textContent = 'OK'
      errorsRoot.appendChild(div)
    }

    let allBuildsOk = true
    for (const b of roster) {
      const r = validateBuild(b)
      if (!r.ok) {
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
      btn.className = 'skill-toggle'
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false')
      btn.innerHTML = `
        <div class="card-title">${def.name}</div>
        <div class="skill-meta">
          <span>SP ${def.spCost}</span>
          <span>CD ${def.cooldownSeconds}s</span>
        </div>
      `
      btn.addEventListener('click', () => {
        const isSelected = selectedSkills.includes(def.name)
        if (isSelected) {
          selectedSkills = selectedSkills.filter(s => s !== def.name)
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
      const input = document.createElement('input')
      input.className = 'number-input'
      input.type = 'number'
      input.min = '0'
      input.max = '9'
      input.step = '1'
      input.value = String(ratios[i])
      input.addEventListener('input', () => {
        const n = clampInt(Number(input.value), 0, 9)
        ratios = ratios.map((v, idx) => (idx === i ? n : v)) as [number, number, number]
        input.value = String(ratios[i])
      })
      row.appendChild(label)
      row.appendChild(input)
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

    renderPartCards('legs')
    renderPartCards('body')
    renderPartCards('weapon')
    renderPartCards('accessory')

    const { allBuildsOk } = renderStatsAndErrors()
    renderSkills()
    renderRatios()

    const ok = canLaunch(allBuildsOk)
    launchBtn.disabled = !ok
    launchHint.textContent = ok
      ? `스킬 ${selectedSkills.length}/3 · 준비 완료`
      : `스킬 ${selectedSkills.length}/3 · 빌드 검증 필요`
  }

  launchBtn.addEventListener('click', () => {
    const allOk = roster.every(b => validateBuild(b).ok)
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
