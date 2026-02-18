import type { Build, Roster, RosterIndex } from '../core/types'
import { resolveBuildParts } from './parts'
import { validateAssembly } from './assembly-rules'

export type DraftRoster = readonly [Build | null, Build | null, Build | null]

export type RosterValidationErrorCode = 'ROSTER_INCOMPLETE' | 'BUILD_INVALID'

export interface RosterValidationError {
  readonly code: RosterValidationErrorCode
  readonly message: string
}

export function createDraftRoster(): DraftRoster {
  return [null, null, null]
}

export function setDraftBuild(
  roster: DraftRoster,
  index: RosterIndex,
  build: Build | null,
): DraftRoster {
  const next: [Build | null, Build | null, Build | null] = [
    roster[0],
    roster[1],
    roster[2],
  ]
  next[index] = build
  return next
}

export function validateRoster(roster: DraftRoster):
  | { readonly ok: true; readonly roster: Roster }
  | { readonly ok: false; readonly errors: readonly RosterValidationError[] } {
  const errors: RosterValidationError[] = []

  const b0 = roster[0]
  const b1 = roster[1]
  const b2 = roster[2]
  if (!b0 || !b1 || !b2) {
    return {
      ok: false,
      errors: [{ code: 'ROSTER_INCOMPLETE', message: 'All 3 roster slots must be filled' }],
    }
  }

  const builds: Roster = [b0, b1, b2]
  for (const build of builds) {
    const { legs, body, weapon, accessory } = resolveBuildParts(build)
    const result = validateAssembly({ legs, body, weapon, accessory })
    if (!result.ok) {
      for (const err of result.errors) {
        errors.push({ code: 'BUILD_INVALID', message: err.message })
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, roster: builds }
}

export function setRosterBuild(roster: Roster, index: RosterIndex, build: Build): Roster {
  const next: [Build, Build, Build] = [roster[0], roster[1], roster[2]]
  next[index] = build
  return next
}
