import { MISSIONS } from '../coop/mission-data'
import { getPartnerById } from '../coop/partner-data'
import type { PartnerPersonality } from '../coop/types'
import { resolveBuildParts } from '../assembly/parts'
import type { Build } from '../core/types'
import { renderMechSvg } from './mech-renderer'

export interface BriefingCallbacks {
  onStartMission(): void
  onBack(): void
}

// ── Condition labels (Korean) ──────────────────────────

const CONDITION_LABELS: Record<string, string> = {
  'tutorial': '튜토리얼',
  'role-learning': '역할 학습',
  'time-limit-3min': '3분 제한',
  'unlock-vanguard': '철풍 합류',
  'unlock-artillery': '먹구름 합류',
  'unlock-bastion': '철벽 합류',
  '5-wave-survival': '5파 생존',
  'double-enemy': '2배 적',
  'reduced-watt': '와트 감소',
  'base-hp-bonus-50%': '기지 HP +50%',
  'forced-team-synergy': '팀 시너지 필수',
  '8-wave-endurance': '8파 내구전',
  'boss-battle': '보스전',
  'rotating-partners': '파트너 교대',
}

const CONDITION_COLORS: Record<string, string> = {
  'tutorial': 'briefing-tag--green',
  'role-learning': 'briefing-tag--green',
  'time-limit-3min': 'briefing-tag--red',
  'unlock-vanguard': 'briefing-tag--gold',
  'unlock-artillery': 'briefing-tag--gold',
  'unlock-bastion': 'briefing-tag--gold',
  '5-wave-survival': 'briefing-tag--red',
  'double-enemy': 'briefing-tag--red',
  'reduced-watt': 'briefing-tag--red',
  'base-hp-bonus-50%': 'briefing-tag--green',
  'forced-team-synergy': 'briefing-tag--cyan',
  '8-wave-endurance': 'briefing-tag--red',
  'boss-battle': 'briefing-tag--red',
  'rotating-partners': 'briefing-tag--cyan',
}

// ── Difficulty helpers ──────────────────────────────────

function difficultyStars(missionId: number): number {
  if (missionId <= 2) return 1
  if (missionId <= 4) return 2
  if (missionId <= 7) return 3
  if (missionId <= 9) return 4
  return 5
}

function difficultyLabel(stars: number): string {
  switch (stars) {
    case 1: return '쉬움'
    case 2: return '보통'
    case 3: return '어려움'
    case 4: return '매우 어려움'
    case 5: return '악몽'
    default: return '???'
  }
}

function difficultyBadgeClass(stars: number): string {
  switch (stars) {
    case 1: return 'badge badge-easy'
    case 2: return 'badge badge-normal'
    case 3: return 'badge badge-hard'
    case 4:
    case 5: return 'badge badge-nightmare'
    default: return 'badge'
  }
}

// ── Build description ───────────────────────────────────

function describeBuild(build: Build): string {
  const parts = resolveBuildParts(build)
  const names = [parts.legs.name, parts.body.name, parts.weapon.name]
  if (parts.accessory) names.push(parts.accessory.name)
  return names.join(' / ')
}

// ── Partner info lookup ─────────────────────────────────

function resolvePartner(partnerId: string): PartnerPersonality | null {
  if (partnerId === 'choice') return null
  try {
    return getPartnerById(partnerId as PartnerPersonality['id'])
  } catch {
    return null
  }
}

// ── Format time ─────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

// ── Main function ───────────────────────────────────────

export function createBriefingUi(
  container: HTMLElement,
  missionIndex: number,
  callbacks: BriefingCallbacks,
): { destroy(): void } {
  const mission = MISSIONS[missionIndex]
  if (!mission) throw new Error(`Invalid mission index: ${missionIndex}`)

  const partner = resolvePartner(mission.partnerId)
  const stars = difficultyStars(mission.id)

  // ── Root screen ──
  const screen = document.createElement('div')
  screen.className = 'screen briefing-layout'

  // ── Title bar ──
  const titleBar = document.createElement('div')
  titleBar.className = 'briefing-title-bar'

  const missionNum = document.createElement('span')
  missionNum.className = 'briefing-mission-num mono'
  missionNum.textContent = `MISSION ${String(mission.id).padStart(2, '0')}`

  const titleSep = document.createElement('span')
  titleSep.className = 'briefing-title-sep'
  titleSep.textContent = '\u2014'

  const titleText = document.createElement('span')
  titleText.className = 'briefing-title-text'
  titleText.innerHTML = `${mission.titleKo} <span class="briefing-title-en">(${mission.title})</span>`

  titleBar.append(missionNum, titleSep, titleText)

  // ── 3-column grid ──
  const grid = document.createElement('div')
  grid.className = 'briefing-grid'

  // ── LEFT: Mission Intel ──
  const leftPanel = document.createElement('div')
  leftPanel.className = 'panel briefing-panel'

  const leftHeader = document.createElement('div')
  leftHeader.className = 'panel-header'
  leftHeader.innerHTML = `<h2 class="panel-title">\uC791\uC804 \uC815\uBCF4</h2><span class="muted">Mission Intel</span>`

  const leftBody = document.createElement('div')
  leftBody.className = 'panel-body briefing-intel'

  // Objective
  const objectiveRow = createInfoRow('목표', 'Objective', '적 기지를 파괴하세요')

  // Time limit
  const timeRow = createInfoRow('제한 시간', 'Time Limit', formatTime(mission.timeLimitSeconds))

  // Base HP
  const baseHpRow = createInfoRow('아군 기지 HP', 'Allied Base', `${mission.baseHp}`)
  const enemyBaseHpRow = createInfoRow('적 기지 HP', 'Enemy Base', `${mission.enemyBaseHp}`)

  // Difficulty
  const diffRow = document.createElement('div')
  diffRow.className = 'briefing-info-row'

  const diffLabel = document.createElement('div')
  diffLabel.className = 'briefing-info-label'
  diffLabel.innerHTML = `\uB09C\uC774\uB3C4 <span class="muted">Difficulty</span>`

  const diffValue = document.createElement('div')
  diffValue.className = 'briefing-info-value'

  const diffBadge = document.createElement('span')
  diffBadge.className = difficultyBadgeClass(stars)
  diffBadge.textContent = difficultyLabel(stars)

  const diffStarsEl = document.createElement('span')
  diffStarsEl.className = 'briefing-diff-stars mono'
  diffStarsEl.textContent = '\u2605'.repeat(stars)

  diffValue.append(diffBadge, diffStarsEl)
  diffRow.append(diffLabel, diffValue)

  // Special conditions
  const conditionsSection = document.createElement('div')
  conditionsSection.className = 'briefing-conditions'

  const condLabel = document.createElement('div')
  condLabel.className = 'briefing-info-label'
  condLabel.innerHTML = `\uD2B9\uC218 \uC870\uAC74 <span class="muted">Special</span>`
  conditionsSection.appendChild(condLabel)

  const tagRow = document.createElement('div')
  tagRow.className = 'briefing-tag-row'

  for (const cond of mission.specialConditions) {
    const tag = document.createElement('span')
    const colorClass = CONDITION_COLORS[cond] ?? ''
    tag.className = `briefing-tag ${colorClass}`
    tag.textContent = CONDITION_LABELS[cond] ?? cond
    tagRow.appendChild(tag)
  }

  conditionsSection.appendChild(tagRow)

  leftBody.append(objectiveRow, timeRow, baseHpRow, enemyBaseHpRow, diffRow, conditionsSection)
  leftPanel.append(leftHeader, leftBody)

  // ── CENTER: Enemy Analysis ──
  const centerPanel = document.createElement('div')
  centerPanel.className = 'panel briefing-panel'

  const centerHeader = document.createElement('div')
  centerHeader.className = 'panel-header'
  centerHeader.innerHTML = `<h2 class="panel-title">\uC801 \uBD84\uC11D</h2><span class="muted">Enemy Analysis</span>`

  const centerBody = document.createElement('div')
  centerBody.className = 'panel-body briefing-enemy'

  // Enemy name
  const enemyNameEl = document.createElement('div')
  enemyNameEl.className = 'briefing-enemy-name'
  enemyNameEl.textContent = mission.enemyName

  centerBody.appendChild(enemyNameEl)

  // Enemy mechs
  const mechGrid = document.createElement('div')
  mechGrid.className = 'briefing-mech-grid'

  for (let i = 0; i < mission.enemyRoster.length; i++) {
    const build = mission.enemyRoster[i]!
    const mechCard = document.createElement('div')
    mechCard.className = 'briefing-mech-card'

    const mechSvg = document.createElement('div')
    mechSvg.className = 'briefing-mech-svg'
    mechSvg.innerHTML = renderMechSvg(build, 48, 'enemy')

    const mechDesc = document.createElement('div')
    mechDesc.className = 'briefing-mech-desc'
    mechDesc.textContent = describeBuild(build)

    mechCard.append(mechSvg, mechDesc)
    mechGrid.appendChild(mechCard)
  }

  centerBody.appendChild(mechGrid)

  // Production ratios
  const ratioSection = document.createElement('div')
  ratioSection.className = 'briefing-ratios'

  const ratioLabel = document.createElement('div')
  ratioLabel.className = 'briefing-info-label'
  ratioLabel.innerHTML = `\uC0DD\uC0B0 \uBE44\uC728 <span class="muted">Ratios</span>`
  ratioSection.appendChild(ratioLabel)

  const ratioTotal = mission.enemyRatios.reduce((a, b) => a + b, 0)
  const ratioBarContainer = document.createElement('div')
  ratioBarContainer.className = 'briefing-ratio-bars'

  for (let i = 0; i < mission.enemyRatios.length; i++) {
    const build = mission.enemyRoster[i]!
    const ratio = mission.enemyRatios[i]!
    const pct = Math.round((ratio / ratioTotal) * 100)

    const row = document.createElement('div')
    row.className = 'briefing-ratio-row'

    const rLabel = document.createElement('span')
    rLabel.className = 'briefing-ratio-label mono'
    const parts = resolveBuildParts(build)
    rLabel.textContent = parts.legs.name

    const barWrap = document.createElement('div')
    barWrap.className = 'briefing-ratio-track'

    const barFill = document.createElement('div')
    barFill.className = 'briefing-ratio-fill'
    barFill.style.width = `${pct}%`

    barWrap.appendChild(barFill)

    const rValue = document.createElement('span')
    rValue.className = 'briefing-ratio-value mono'
    rValue.textContent = `${pct}%`

    row.append(rLabel, barWrap, rValue)
    ratioBarContainer.appendChild(row)
  }

  ratioSection.appendChild(ratioBarContainer)
  centerBody.appendChild(ratioSection)

  centerPanel.append(centerHeader, centerBody)

  // ── RIGHT: Partner ──
  const rightPanel = document.createElement('div')
  rightPanel.className = 'panel briefing-panel'

  const rightHeader = document.createElement('div')
  rightHeader.className = 'panel-header'
  rightHeader.innerHTML = `<h2 class="panel-title">\uD30C\uD2B8\uB108</h2><span class="muted">Partner</span>`

  const rightBody = document.createElement('div')
  rightBody.className = 'panel-body briefing-partner'

  if (partner) {
    // Partner name
    const pName = document.createElement('div')
    pName.className = 'briefing-partner-name'
    pName.textContent = partner.name

    const pCodename = document.createElement('div')
    pCodename.className = 'briefing-partner-codename'
    pCodename.textContent = `"${partner.codenameko}" (${partner.codename})`

    // Partner icon
    const pIcon = document.createElement('div')
    pIcon.className = 'briefing-partner-icon'
    pIcon.textContent = getPartnerIcon(partner.id)

    // Partner description
    const pDesc = document.createElement('div')
    pDesc.className = 'briefing-partner-desc muted'
    pDesc.textContent = partner.description

    // Partner style
    const pStyle = document.createElement('div')
    pStyle.className = 'briefing-partner-style'

    const styleLabel = document.createElement('span')
    styleLabel.className = 'briefing-info-label'
    styleLabel.innerHTML = `\uC804\uD22C \uC2A4\uD0C0\uC77C <span class="muted">Style</span>`

    const styleValue = document.createElement('span')
    styleValue.className = 'mono'
    styleValue.textContent = getTimingLabel(partner.skillTiming)

    pStyle.append(styleLabel, styleValue)

    // Partner skills
    const pSkills = document.createElement('div')
    pSkills.className = 'briefing-partner-skills'

    const skillLabel = document.createElement('div')
    skillLabel.className = 'briefing-info-label'
    skillLabel.innerHTML = `\uC2A4\uD0AC <span class="muted">Skills</span>`
    pSkills.appendChild(skillLabel)

    const skillTags = document.createElement('div')
    skillTags.className = 'briefing-tag-row'
    for (const skill of partner.preferredSkills) {
      const st = document.createElement('span')
      st.className = 'briefing-tag briefing-tag--cyan'
      st.textContent = skill
      skillTags.appendChild(st)
    }
    pSkills.appendChild(skillTags)

    rightBody.append(pName, pCodename, pIcon, pDesc, pStyle, pSkills)
  } else {
    // Partner is 'choice'
    const choiceEl = document.createElement('div')
    choiceEl.className = 'briefing-partner-choice'

    const choiceTitle = document.createElement('div')
    choiceTitle.className = 'briefing-partner-name'
    choiceTitle.textContent = '파트너 선택'

    const choiceDesc = document.createElement('div')
    choiceDesc.className = 'muted'
    choiceDesc.textContent = '이번 작전에서는 파트너를 자유롭게 선택할 수 있습니다.'

    const choiceIcon = document.createElement('div')
    choiceIcon.className = 'briefing-partner-icon'
    choiceIcon.textContent = '?'

    choiceEl.append(choiceTitle, choiceIcon, choiceDesc)
    rightBody.appendChild(choiceEl)
  }

  rightPanel.append(rightHeader, rightBody)

  grid.append(leftPanel, centerPanel, rightPanel)

  // ── Bottom: Action buttons ──
  const actions = document.createElement('div')
  actions.className = 'briefing-actions'

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'btn btn-ghost btn-xl'
  backBtn.textContent = '\uB4A4\uB85C'
  backBtn.addEventListener('click', () => callbacks.onBack())

  const deployBtn = document.createElement('button')
  deployBtn.type = 'button'
  deployBtn.className = 'btn btn-primary btn-xl briefing-deploy-btn'
  deployBtn.textContent = '\uCD9C\uACA9'
  deployBtn.addEventListener('click', () => callbacks.onStartMission())

  actions.append(backBtn, deployBtn)

  // ── Assemble screen ──
  screen.append(titleBar, grid, actions)
  container.replaceChildren(screen)

  return {
    destroy(): void {
      screen.remove()
    },
  }
}

// ── Helpers ─────────────────────────────────────────────

function createInfoRow(labelKo: string, labelEn: string, value: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'briefing-info-row'

  const label = document.createElement('div')
  label.className = 'briefing-info-label'
  label.innerHTML = `${labelKo} <span class="muted">${labelEn}</span>`

  const val = document.createElement('div')
  val.className = 'briefing-info-value mono'
  val.textContent = value

  row.append(label, val)
  return row
}

function getPartnerIcon(id: string): string {
  switch (id) {
    case 'vanguard': return 'K'
    case 'bastion': return 'M'
    case 'artillery': return 'Z'
    case 'support': return 'L'
    default: return '?'
  }
}

function getTimingLabel(timing: string): string {
  switch (timing) {
    case 'proactive': return '공격적 (Proactive)'
    case 'reactive': return '방어적 (Reactive)'
    case 'balanced': return '균형 (Balanced)'
    default: return timing
  }
}
