import type { Build, SynergyDefinition } from '../core/types'
import { SYNERGIES } from '../data/synergy-data'
import { getBodyById, getLegsById, getWeaponById } from './parts'

export function findSynergies(build: Build): readonly SynergyDefinition[] {
  const legs = getLegsById(build.legsId)
  const body = getBodyById(build.bodyId)
  const weapon = getWeaponById(build.weaponId)

  if (!legs || !body || !weapon) return []
  if (legs.slot !== 'legs' || body.slot !== 'body' || weapon.slot !== 'weapon') return []

  return SYNERGIES.filter((syn) => {
    const c = syn.condition
    if (c.legsMove && legs.moveType !== c.legsMove) return false
    if (c.bodyMount && body.mountType !== c.bodyMount) return false
    if (c.bodyId && body.id !== c.bodyId) return false
    if (c.weaponId && weapon.id !== c.weaponId) return false
    if (c.accessoryId && build.accessoryId !== c.accessoryId) return false
    return true
  })
}

export function hasSynergy(build: Build, synergyId: string): boolean {
  return findSynergies(build).some((s) => s.id === synergyId)
}
