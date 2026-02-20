import type { BattleConfig, BattleResult, BattleState } from '../combat/battle'
import { createBattle } from '../combat/battle'
import { ENEMY_PRESETS } from '../data/enemies-data'
import type { PartId } from './types'
import type { Inventory } from '../assembly/inventory'
import { addGold, buyPart, createStartingInventory } from '../assembly/inventory'
import type { AssemblyResult } from '../ui/assembly-ui'
import { createAssemblyUi } from '../ui/assembly-ui'
import { createBattleUi } from '../ui/battle-ui'
import { createMainMenu } from '../ui/main-menu'
import {
  initAudio,
  playBattleBgm,
  playMenuBgm,
  playSfx,
  stopBgm,
} from '../ui/audio'
import { createResultUi } from '../ui/result-ui'
import { createShopUi } from '../ui/shop-ui'
import {
  isTutorialDone,
  markTutorialDone,
  resetTutorial,
  showOverlayTutorial,
  showQuickGuide,
  type TutorialStep,
} from '../ui/tutorial'
import { createMissionSelectUi } from '../ui/mission-select-ui'
import { createDialogueUi, type DialogueEntry } from '../ui/dialogue-ui'
import { MISSIONS } from '../coop/mission-data'
import { getPartnerById } from '../coop/partner-data'
import type { CoopBattleConfig } from '../coop/coop-battle'
import { createCoopBattle } from '../coop/coop-battle'
import { getCurrentCallout } from '../coop/callout-queue'

type ScreenHandle = { destroy(): void }

export function startGame(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) throw new Error('Missing #app root element')

  const root = document.createElement('div')
  root.className = 'app-root'
  app.replaceChildren(root)

  root.addEventListener('click', () => initAudio(), { once: true })
  root.addEventListener('touchstart', () => initAudio(), { once: true })

  let current: ScreenHandle | null = null
  let enemyPresetIndex: number | null = null
  let lastAssembly: AssemblyResult | null = null
  let inventory: Inventory = createStartingInventory()

  let battleSpeed = 1
  let battlePaused = false
  let rafId: number | null = null
  let battleRunning = false

  // Campaign state
  let campaignUnlocked = 1 // starts with mission 1 unlocked

  let onboardingEnabled = !isTutorialDone()
  let menuTutorialShown = false
  let assemblyTutorialShown = false
  let battleTutorialShown = false

  function queueTutorial(steps: TutorialStep[], onComplete: () => void): void {
    requestAnimationFrame(() => showOverlayTutorial(steps, onComplete))
  }

  function runMenuTutorial(): void {
    queueTutorial(
      [
        {
          title: '메인 메뉴',
          target: '[data-role="enemy-list"]',
          placement: 'right',
          message: '적을 골라 전투를 시작하세요',
          advanceOn: { selector: '.enemy-item', event: 'click' },
        },
      ],
      () => {
        menuTutorialShown = true
      },
    )
  }

  function runAssemblyTutorial(): void {
    queueTutorial(
      [
        {
          title: '조립실 1/5',
          target: '[data-tutorial="build-tabs"]',
          placement: 'bottom',
          message: '빌드 A/B/C 탭으로 로봇 3대를 조립합니다',
        },
        {
          title: '조립실 2/5',
          target: '[data-tutorial="parts-panel"]',
          placement: 'right',
          message: '왼쪽 파츠 목록에서 다리/몸체/무기/보조를 선택하세요',
          advanceOn: { selector: '.slot-btn', event: 'click' },
        },
        {
          title: '조립실 3/5',
          target: '[data-tutorial="stats-panel"]',
          placement: 'left',
          message: '오른쪽 스탯을 확인하세요. 적재량 초과에 주의!',
        },
        {
          title: '조립실 4/5',
          target: '[data-tutorial="skill-grid"]',
          placement: 'top',
          message: '스킬 3개를 선택하세요',
          advanceOn: { selector: '.skill-toggle', event: 'click' },
        },
        {
          title: '조립실 5/5',
          target: '[data-tutorial="launch-button"]',
          placement: 'top',
          message: '생산 비율을 조정하고 출격!',
          advanceOn: { selector: '[data-tutorial="launch-button"]', event: 'click' },
        },
      ],
      () => {
        assemblyTutorialShown = true
      },
    )
  }

  function runBattleTutorial(): void {
    queueTutorial(
      [
        {
          title: '전투 HUD',
          target: '.hud',
          placement: 'left',
          message:
            '와트: 로봇 생산 자원 (자동 충전)\nSP: 스킬 사용 자원\n스킬 버튼: 타이밍 맞춰 누르세요!\n속도: 전투 속도 조절',
        },
      ],
      () => {
        battleTutorialShown = true
        onboardingEnabled = false
        markTutorialDone()
      },
    )
  }

  function setScreen(next: ScreenHandle): void {
    if (battleRunning) {
      battleRunning = false
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
    }

    current?.destroy()
    current = next
  }

  function buildBattleConfig(seed: number): BattleConfig {
    if (enemyPresetIndex === null) throw new Error('Enemy preset not selected')
    if (!lastAssembly) throw new Error('Missing assembly config')

    const preset = ENEMY_PRESETS[enemyPresetIndex]
    if (!preset) throw new Error('Invalid enemy preset index')

    return {
      playerRoster: lastAssembly.roster,
      playerRatios: lastAssembly.ratios,
      playerDeck: lastAssembly.deck,
      enemyRoster: preset.roster,
      enemyRatios: preset.ratios,
      seed,
      ticksPerSecond: 20,
      timeLimitSeconds: 300,
    }
  }

  function goMenu(): void {
    playMenuBgm()

    setScreen(
      createMainMenu(
        root,
        inventory.gold,
        {
          onSelectEnemy(presetIndex) {
            playSfx('click')
            enemyPresetIndex = presetIndex
            goAssembly()
          },
          onGoShop() {
            playSfx('click')
            goShop()
          },
          onShowGuide() {
            playSfx('click')
            showQuickGuide(root)
          },
          onReplayTutorial() {
            playSfx('click')
            resetTutorial()
            onboardingEnabled = true
            menuTutorialShown = false
            assemblyTutorialShown = false
            battleTutorialShown = false
            runMenuTutorial()
          },
          onCampaign() {
            playSfx('click')
            goMissionSelect()
          },
          onCoopBattle() {
            playSfx('click')
            goCoopAssembly()
          },
        },
      ),
    )

    if (onboardingEnabled && !menuTutorialShown) {
      runMenuTutorial()
    }
  }

  function goShop(): void {
    playMenuBgm()

    let handle: ReturnType<typeof createShopUi> | null = null
    handle = createShopUi(root, inventory, {
      onBuy(partId: PartId) {
        const next = buyPart(inventory, partId)
        if (!next) return
        playSfx('purchase')
        inventory = next
        handle?.refresh(inventory)
      },
      onBack() {
        playSfx('click')
        goMenu()
      },
    })
    setScreen(handle)
  }

  function goAssembly(): void {
    playMenuBgm()

    setScreen(
      createAssemblyUi(root, {
        onLaunch(result) {
          playSfx('click')
          lastAssembly = result
          goBattle()
        },
      }),
    )

    if (onboardingEnabled && !assemblyTutorialShown) {
      runAssemblyTutorial()
    }
  }

  async function goBattle(): Promise<void> {
    if (enemyPresetIndex === null) {
      goMenu()
      return
    }
    if (!lastAssembly) {
      goAssembly()
      return
    }

    battleSpeed = 1
    battlePaused = false

    const config = buildBattleConfig(Date.now())
    const engine = createBattle(config)
    playBattleBgm()

    const ui = await createBattleUi(root, {
      onSkillActivate(skillIndex) {
        playSfx('skill')
        engine.activateSkill(skillIndex)
      },
      onSpeedChange(speed) {
        battleSpeed = speed
        battlePaused = false
      },
      onPause() {
        battlePaused = !battlePaused
      },
    })

    setScreen(ui)
    battleRunning = true

    if (onboardingEnabled && !battleTutorialShown) {
      runBattleTutorial()
    }

    const fixedDt = 1 / config.ticksPerSecond
    let lastTimestamp: number | null = null
    let accumulator = 0

    const frame = (timestamp: number): void => {
      if (!battleRunning) return

      if (lastTimestamp === null) lastTimestamp = timestamp
      const realDelta = Math.min((timestamp - lastTimestamp) / 1000, 0.1)
      lastTimestamp = timestamp

      if (!battlePaused) {
        accumulator += realDelta * battleSpeed
        while (accumulator >= fixedDt) {
          engine.tick()
          accumulator -= fixedDt
        }
      }

      const state = engine.getState()
      ui.update(state, realDelta)

      if (engine.isFinished()) {
        battleRunning = false
        const result = state.result
        if (!result) throw new Error('Battle finished without result')
        goResult(result)
        return
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
  }

  function goResult(result: BattleResult): void {
    stopBgm()
    window.setTimeout(() => {
      playMenuBgm()
    }, 1000)

    if (result.outcome === 'player_win') {
      playSfx('victory')
    } else if (result.outcome === 'enemy_win') {
      playSfx('defeat')
    }

    const goldReward = getGoldReward(result)
    inventory = addGold(inventory, goldReward)
    setScreen(
      createResultUi(root, result, {
        onPlayAgain() {
          playSfx('click')
          goBattle()
        },
        onBackToAssembly() {
          playSfx('click')
          goAssembly()
        },
      }),
    )
  }

  // ─── Campaign flow ──────────────────────────────────────

  function goMissionSelect(): void {
    playMenuBgm()

    setScreen(
      createMissionSelectUi(root, campaignUnlocked, {
        onSelectMission(missionIndex) {
          playSfx('click')
          goMissionPre(missionIndex)
        },
        onBack() {
          playSfx('click')
          goMenu()
        },
      }),
    )
  }

  function goMissionPre(missionIndex: number): void {
    const mission = MISSIONS[missionIndex]
    if (!mission) {
      goMissionSelect()
      return
    }

    if (mission.preDialogue.length === 0) {
      goMissionAssembly(missionIndex)
      return
    }

    const dialogues: DialogueEntry[] = mission.preDialogue.map(d => ({
      speaker: d.speaker,
      emotion: d.emotion as DialogueEntry['emotion'],
      text: d.text,
    }))

    const handle = createDialogueUi(root, dialogues, () => {
      goMissionAssembly(missionIndex)
    })
    setScreen(handle)
  }

  function goMissionAssembly(missionIndex: number): void {
    playMenuBgm()

    setScreen(
      createAssemblyUi(root, {
        onLaunch(result) {
          playSfx('click')
          lastAssembly = result
          goCoopBattle(missionIndex)
        },
      }),
    )
  }

  async function goCoopBattle(missionIndex: number): Promise<void> {
    if (!lastAssembly) {
      goMissionAssembly(missionIndex)
      return
    }

    const mission = MISSIONS[missionIndex]
    if (!mission) {
      goMissionSelect()
      return
    }

    const partnerId = mission.partnerId === 'choice' ? 'support' : mission.partnerId
    const partner = getPartnerById(partnerId as 'vanguard' | 'bastion' | 'artillery' | 'support')

    battleSpeed = 1
    battlePaused = false

    const config: CoopBattleConfig = {
      playerRoster: lastAssembly.roster,
      playerRatios: lastAssembly.ratios,
      playerDeck: lastAssembly.deck,
      partner,
      enemyRoster: mission.enemyRoster,
      enemyRatios: mission.enemyRatios as [number, number, number],
      baseHp: mission.baseHp,
      enemyBaseHp: mission.enemyBaseHp,
      seed: Date.now(),
      ticksPerSecond: 20,
      timeLimitSeconds: mission.timeLimitSeconds,
    }

    const engine = createCoopBattle(config)
    playBattleBgm()

    const ui = await createBattleUi(
      root,
      {
        onSkillActivate(skillIndex) {
          playSfx('skill')
          engine.activateSkill(skillIndex)
        },
        onSpeedChange(speed) {
          battleSpeed = speed
          battlePaused = false
        },
        onPause() {
          battlePaused = !battlePaused
        },
      },
      mission.timeLimitSeconds,
    )

    setScreen(ui)
    battleRunning = true

    const fixedDt = 1 / config.ticksPerSecond
    let lastTimestamp: number | null = null
    let accumulator = 0
    let lastCalloutText: string | null = null

    const frame = (timestamp: number): void => {
      if (!battleRunning) return

      if (lastTimestamp === null) lastTimestamp = timestamp
      const realDelta = Math.min((timestamp - lastTimestamp) / 1000, 0.1)
      lastTimestamp = timestamp

      if (!battlePaused) {
        accumulator += realDelta * battleSpeed
        while (accumulator >= fixedDt) {
          engine.tick()
          accumulator -= fixedDt
        }
      }

      const coopState = engine.getState()

      // Map CoopBattleState → BattleState for the renderer
      const renderState: BattleState = {
        elapsedSeconds: coopState.elapsedSeconds,
        battlefield: coopState.battlefield,
        units: coopState.units,
        playerWatt: coopState.playerWatt,
        enemyWatt: coopState.enemyWatt,
        skillSystem: coopState.playerSkillSystem,
        playerBuildStats: coopState.playerBuildStats,
        enemyBuildStats: coopState.enemyBuildStats,
        result: coopState.result,
      }

      ui.update(renderState, realDelta)

      // Show callouts from partner AI
      const callout = getCurrentCallout(coopState.calloutQueue)
      if (callout && callout.message.text !== lastCalloutText) {
        lastCalloutText = callout.message.text
        ui.showCallout(callout.message.text, callout.message.speaker)
      } else if (!callout) {
        lastCalloutText = null
      }

      if (engine.isFinished()) {
        battleRunning = false
        const result = coopState.result
        if (!result) throw new Error('Battle finished without result')
        goMissionResult(missionIndex, result)
        return
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
  }

  function goMissionResult(missionIndex: number, result: BattleResult): void {
    stopBgm()

    const mission = MISSIONS[missionIndex]!
    const won = result.outcome === 'player_win'

    if (won) {
      playSfx('victory')
      // Unlock next mission
      if (missionIndex + 1 >= campaignUnlocked) {
        campaignUnlocked = Math.min(MISSIONS.length, missionIndex + 2)
      }
    } else {
      playSfx('defeat')
    }

    const goldReward = getGoldReward(result)
    inventory = addGold(inventory, goldReward)

    // Post-battle dialogue
    const postDialogue = won ? mission.postDialogueWin : mission.postDialogueLose
    if (postDialogue.length > 0) {
      const dialogues: DialogueEntry[] = postDialogue.map(d => ({
        speaker: d.speaker,
        emotion: d.emotion as DialogueEntry['emotion'],
        text: d.text,
      }))

      const handle = createDialogueUi(root, dialogues, () => {
        showMissionResultScreen(missionIndex, result)
      })
      setScreen(handle)
    } else {
      showMissionResultScreen(missionIndex, result)
    }
  }

  function showMissionResultScreen(missionIndex: number, result: BattleResult): void {
    window.setTimeout(() => {
      playMenuBgm()
    }, 500)

    setScreen(
      createResultUi(root, result, {
        onPlayAgain() {
          playSfx('click')
          goCoopBattle(missionIndex)
        },
        onBackToAssembly() {
          playSfx('click')
          goMissionSelect()
        },
      }),
    )
  }

  // ─── Co-op free battle (from main menu) ─────────────────

  function goCoopAssembly(): void {
    // Default to first enemy preset for free co-op battle
    enemyPresetIndex = 0

    playMenuBgm()

    setScreen(
      createAssemblyUi(root, {
        onLaunch(result) {
          playSfx('click')
          lastAssembly = result
          goFreeCoopBattle()
        },
      }),
    )
  }

  async function goFreeCoopBattle(): Promise<void> {
    if (!lastAssembly || enemyPresetIndex === null) {
      goMenu()
      return
    }

    const preset = ENEMY_PRESETS[enemyPresetIndex]
    if (!preset) {
      goMenu()
      return
    }

    // Default partner for free battle
    const partner = getPartnerById('support')

    battleSpeed = 1
    battlePaused = false

    const config: CoopBattleConfig = {
      playerRoster: lastAssembly.roster,
      playerRatios: lastAssembly.ratios,
      playerDeck: lastAssembly.deck,
      partner,
      enemyRoster: preset.roster,
      enemyRatios: preset.ratios,
      seed: Date.now(),
      ticksPerSecond: 20,
      timeLimitSeconds: 300,
    }

    const engine = createCoopBattle(config)
    playBattleBgm()

    const ui = await createBattleUi(root, {
      onSkillActivate(skillIndex) {
        playSfx('skill')
        engine.activateSkill(skillIndex)
      },
      onSpeedChange(speed) {
        battleSpeed = speed
        battlePaused = false
      },
      onPause() {
        battlePaused = !battlePaused
      },
    })

    setScreen(ui)
    battleRunning = true

    const fixedDt = 1 / config.ticksPerSecond
    let lastTimestamp: number | null = null
    let accumulator = 0
    let lastCalloutText: string | null = null

    const frame = (timestamp: number): void => {
      if (!battleRunning) return

      if (lastTimestamp === null) lastTimestamp = timestamp
      const realDelta = Math.min((timestamp - lastTimestamp) / 1000, 0.1)
      lastTimestamp = timestamp

      if (!battlePaused) {
        accumulator += realDelta * battleSpeed
        while (accumulator >= fixedDt) {
          engine.tick()
          accumulator -= fixedDt
        }
      }

      const coopState = engine.getState()

      const renderState: BattleState = {
        elapsedSeconds: coopState.elapsedSeconds,
        battlefield: coopState.battlefield,
        units: coopState.units,
        playerWatt: coopState.playerWatt,
        enemyWatt: coopState.enemyWatt,
        skillSystem: coopState.playerSkillSystem,
        playerBuildStats: coopState.playerBuildStats,
        enemyBuildStats: coopState.enemyBuildStats,
        result: coopState.result,
      }

      ui.update(renderState, realDelta)

      const callout = getCurrentCallout(coopState.calloutQueue)
      if (callout && callout.message.text !== lastCalloutText) {
        lastCalloutText = callout.message.text
        ui.showCallout(callout.message.text, callout.message.speaker)
      } else if (!callout) {
        lastCalloutText = null
      }

      if (engine.isFinished()) {
        battleRunning = false
        const result = coopState.result
        if (!result) throw new Error('Battle finished without result')
        goResult(result)
        return
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
  }

  function getGoldReward(result: BattleResult): number {
    switch (result.outcome) {
      case 'player_win':
        return 100
      case 'enemy_win':
        return 30
      case 'draw':
        return 50
    }
  }

  goMenu()
}
