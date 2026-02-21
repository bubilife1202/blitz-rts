// ─── Build Naming & Team Color Customization ────────────

const BUILD_NAMES_KEY = 'blitz-rts-build-names'
const TEAM_COLOR_KEY = 'blitz-rts-team-color'

const DEFAULT_BUILD_NAMES: readonly [string, string, string] = ['알파', '브라보', '찰리']
const DEFAULT_TEAM_COLOR = '#4FC3F7'

export const TEAM_COLOR_PRESETS: readonly { readonly label: string; readonly hex: string }[] = [
  { label: '시안', hex: '#4FC3F7' },
  { label: '금색', hex: '#FFD54F' },
  { label: '에메랄드', hex: '#66BB6A' },
  { label: '보라', hex: '#BA68C8' },
  { label: '주황', hex: '#FF8A65' },
  { label: '핑크', hex: '#F06292' },
]

export function getBuildNames(): [string, string, string] {
  try {
    const raw = localStorage.getItem(BUILD_NAMES_KEY)
    if (!raw) return [...DEFAULT_BUILD_NAMES]
    const parsed: unknown = JSON.parse(raw)
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((v) => typeof v === 'string')
    ) {
      return parsed as [string, string, string]
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_BUILD_NAMES]
}

export function saveBuildNames(names: [string, string, string]): void {
  localStorage.setItem(BUILD_NAMES_KEY, JSON.stringify(names))
}

export function getTeamColor(): string {
  try {
    const raw = localStorage.getItem(TEAM_COLOR_KEY)
    if (raw && /^#[0-9A-Fa-f]{6}$/.test(raw)) return raw
  } catch {
    // ignore
  }
  return DEFAULT_TEAM_COLOR
}

export function saveTeamColor(color: string): void {
  localStorage.setItem(TEAM_COLOR_KEY, color)
}
