import {
  getMasterVolume,
  setMasterVolume,
  getBgmVolume,
  setBgmVolume,
  getSfxVolume,
  setSfxVolume,
  playSfx,
} from './audio'
import {
  getAllAchievements,
  getUnlockedAchievements,
} from '../progression/achievements'

const SPEED_STORAGE_KEY = 'blitz-rts-default-speed'

export interface SettingsCallbacks {
  onClose(): void
}

export function getDefaultSpeed(): number {
  try {
    const raw = window.localStorage.getItem(SPEED_STORAGE_KEY)
    if (raw === '2') return 2
    if (raw === '4') return 4
    return 1
  } catch {
    return 1
  }
}

function setDefaultSpeed(speed: number): void {
  try {
    window.localStorage.setItem(SPEED_STORAGE_KEY, String(speed))
  } catch {
    // Ignore storage write failures.
  }
}

export function createSettingsUi(
  container: HTMLElement,
  callbacks: SettingsCallbacks,
): { destroy(): void } {
  const backdrop = document.createElement('div')
  backdrop.className = 'settings-backdrop'
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      playSfx('click')
      callbacks.onClose()
    }
  })

  const panel = document.createElement('div')
  panel.className = 'settings-panel panel'

  // ── Header ──
  const header = document.createElement('div')
  header.className = 'panel-header'
  const titleEl = document.createElement('h2')
  titleEl.className = 'panel-title'
  titleEl.textContent = '설정'
  header.appendChild(titleEl)
  panel.appendChild(header)

  const body = document.createElement('div')
  body.className = 'panel-body settings-body'

  // ── Audio Section ──
  const audioSection = createSection('오디오')
  body.appendChild(audioSection.header)

  body.appendChild(
    createSliderRow('마스터 볼륨', getMasterVolume(), (v) => {
      setMasterVolume(v)
    }),
  )
  body.appendChild(
    createSliderRow('BGM 볼륨', getBgmVolume(), (v) => {
      setBgmVolume(v)
    }),
  )
  body.appendChild(
    createSliderRow('SFX 볼륨', getSfxVolume(), (v) => {
      setSfxVolume(v)
      playSfx('click')
    }),
  )

  // ── Game Section ──
  const gameSection = createSection('게임')
  body.appendChild(gameSection.header)

  // Default speed
  const speedRow = document.createElement('div')
  speedRow.className = 'form-row'
  const speedLabel = document.createElement('span')
  speedLabel.textContent = '기본 배속'
  speedRow.appendChild(speedLabel)

  const speedSelect = document.createElement('select')
  speedSelect.className = 'settings-select'
  const currentSpeed = getDefaultSpeed()
  for (const s of [1, 2, 4]) {
    const opt = document.createElement('option')
    opt.value = String(s)
    opt.textContent = `${s}x`
    if (s === currentSpeed) opt.selected = true
    speedSelect.appendChild(opt)
  }
  speedSelect.addEventListener('change', () => {
    setDefaultSpeed(Number(speedSelect.value))
    playSfx('click')
  })
  speedRow.appendChild(speedSelect)
  body.appendChild(speedRow)

  // Language
  const langRow = document.createElement('div')
  langRow.className = 'form-row'
  const langLabel = document.createElement('span')
  langLabel.textContent = '언어'
  langRow.appendChild(langLabel)

  const langValue = document.createElement('span')
  langValue.className = 'muted'
  langValue.textContent = '한국어 (추후 지원 예정)'
  langRow.appendChild(langValue)
  body.appendChild(langRow)

  // ── Data Section ──
  const dataSection = createSection('데이터')
  body.appendChild(dataSection.header)

  // Achievements
  const achieveRow = document.createElement('div')
  achieveRow.className = 'form-row'
  const achieveLabel = document.createElement('span')
  achieveLabel.textContent = '업적 목록'
  achieveRow.appendChild(achieveLabel)

  const allAchievements = getAllAchievements()
  const unlockedCount = getUnlockedAchievements().length
  const achieveValue = document.createElement('span')
  achieveValue.className = 'mono'
  achieveValue.textContent = `${unlockedCount}/${allAchievements.length} 해금`
  achieveRow.appendChild(achieveValue)
  body.appendChild(achieveRow)

  // Reset Progress
  const resetRow = document.createElement('div')
  resetRow.className = 'form-row'
  const resetLabel = document.createElement('span')
  resetLabel.textContent = '진행 초기화'
  resetRow.appendChild(resetLabel)

  const resetBtn = document.createElement('button')
  resetBtn.type = 'button'
  resetBtn.className = 'btn btn-danger'
  resetBtn.textContent = '초기화'
  resetBtn.addEventListener('click', () => {
    playSfx('click')
    const confirmed = window.confirm(
      '모든 진행 데이터가 삭제됩니다.\n정말 초기화하시겠습니까?',
    )
    if (confirmed) {
      try {
        window.localStorage.clear()
      } catch {
        // Ignore
      }
      window.location.reload()
    }
  })
  resetRow.appendChild(resetBtn)
  body.appendChild(resetRow)

  panel.appendChild(body)

  // ── Close Button ──
  const footer = document.createElement('div')
  footer.className = 'settings-footer'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'btn btn-primary btn-xl'
  closeBtn.textContent = '닫기'
  closeBtn.addEventListener('click', () => {
    playSfx('click')
    callbacks.onClose()
  })
  footer.appendChild(closeBtn)
  panel.appendChild(footer)

  backdrop.appendChild(panel)
  container.appendChild(backdrop)

  return {
    destroy(): void {
      backdrop.remove()
    },
  }
}

function createSection(title: string): { header: HTMLElement } {
  const header = document.createElement('div')
  header.className = 'settings-section-header'
  header.textContent = title
  return { header }
}

function createSliderRow(
  label: string,
  initialValue: number,
  onChange: (value: number) => void,
): HTMLElement {
  const row = document.createElement('div')
  row.className = 'form-row'

  const labelEl = document.createElement('span')
  labelEl.textContent = label
  row.appendChild(labelEl)

  const controls = document.createElement('div')
  controls.className = 'settings-slider-wrap'

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'settings-slider'
  slider.min = '0'
  slider.max = '100'
  slider.value = String(Math.round(initialValue * 100))

  const valueEl = document.createElement('span')
  valueEl.className = 'settings-slider-value mono'
  valueEl.textContent = String(Math.round(initialValue * 100))

  slider.addEventListener('input', () => {
    const v = Number(slider.value) / 100
    valueEl.textContent = slider.value
    onChange(v)
  })

  controls.appendChild(slider)
  controls.appendChild(valueEl)
  row.appendChild(controls)
  return row
}
