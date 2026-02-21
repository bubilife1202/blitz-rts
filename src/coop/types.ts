import type { PartnerPersonalityId, SkillName, Roster } from '../core/types'

export type CalloutPriority = 'CRITICAL' | 'TACTICAL' | 'REACTION' | 'FLAVOR'

export interface CalloutMessage {
  readonly priority: CalloutPriority
  readonly text: string
  readonly speaker: PartnerPersonalityId
  readonly duration: number // display time in seconds
}

export interface PartnerPersonality {
  readonly id: PartnerPersonalityId
  readonly name: string
  readonly codename: string
  readonly codenameko: string
  readonly description: string
  readonly preferredSkills: readonly [SkillName, SkillName, SkillName]
  readonly roster: Roster
  readonly ratios: readonly [number, number, number]
  readonly aggressiveness: number // 0-1, higher = more aggressive spending
  readonly skillTiming: 'proactive' | 'reactive' | 'balanced'
}

export interface MissionDefinition {
  readonly id: number
  readonly title: string
  readonly titleKo: string
  readonly partnerId: PartnerPersonalityId | 'choice'
  readonly enemyName: string
  readonly enemyRoster: Roster
  readonly enemyRatios: readonly [number, number, number]
  readonly baseHp: number
  readonly enemyBaseHp: number
  readonly timeLimitSeconds: number
  readonly specialConditions: readonly string[]
  readonly preDialogue: readonly DialogueLine[]
  readonly postDialogueWin: readonly DialogueLine[]
  readonly postDialogueLose: readonly DialogueLine[]
}

export type DialogueEmotion =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'worried'
  | 'excited'
  | 'confident'
  | 'calm'
  | 'sad'

export interface DialogueLine {
  readonly speaker: string
  readonly emotion: DialogueEmotion
  readonly text: string
}
