import { describe, it, expect } from 'vitest'
import { MISSIONS, getMissionById } from '../src/coop/mission-data'
import { resolveBuildParts } from '../src/assembly/parts'

describe('MissionData', () => {
  it('has 10 missions', () => {
    expect(MISSIONS).toHaveLength(10)
  })

  it('missions have sequential IDs', () => {
    for (let i = 0; i < MISSIONS.length; i++) {
      expect(MISSIONS[i]!.id).toBe(i + 1)
    }
  })

  it('all missions have valid partner IDs', () => {
    const validPartners = ['vanguard', 'bastion', 'artillery', 'support', 'choice']
    for (const mission of MISSIONS) {
      expect(validPartners).toContain(mission.partnerId)
    }
  })

  it('all missions have pre-dialogue', () => {
    for (const mission of MISSIONS) {
      expect(mission.preDialogue.length).toBeGreaterThan(0)
    }
  })

  it('all missions have post-dialogue for win and lose', () => {
    for (const mission of MISSIONS) {
      expect(mission.postDialogueWin.length).toBeGreaterThan(0)
      expect(mission.postDialogueLose.length).toBeGreaterThan(0)
    }
  })

  it('getMissionById finds mission', () => {
    const m = getMissionById(1)
    expect(m).toBeDefined()
    expect(m!.title).toBe('First Sortie')
  })

  it('getMissionById returns undefined for invalid', () => {
    expect(getMissionById(99)).toBeUndefined()
  })

  it('all enemy rosters have valid builds (weight within capacity)', () => {
    for (const mission of MISSIONS) {
      for (let i = 0; i < 3; i++) {
        const build = mission.enemyRoster[i]
        const parts = resolveBuildParts(build)
        const totalWeight = parts.body.weight + parts.weapon.weight + (parts.accessory?.weight ?? 0)
        expect(totalWeight).toBeLessThanOrEqual(parts.legs.loadCapacity)
      }
    }
  })

  it('all enemy rosters have matching mount types', () => {
    for (const mission of MISSIONS) {
      for (let i = 0; i < 3; i++) {
        const build = mission.enemyRoster[i]
        const parts = resolveBuildParts(build)
        expect(parts.weapon.mountType).toBe(parts.body.mountType)
      }
    }
  })
})
