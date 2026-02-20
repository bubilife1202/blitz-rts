type BgmMode = 'menu' | 'battle' | null

export type SfxType =
  | 'click'
  | 'fire'
  | 'explosion'
  | 'skill'
  | 'purchase'
  | 'victory'
  | 'defeat'

const MUTE_STORAGE_KEY = 'blitz-rts-muted'
const BGM_VOLUME = 0.15
const SFX_VOLUME = 0.3

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let bgmGain: GainNode | null = null
let sfxGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

let muted = loadMutedState()
let desiredBgm: BgmMode = null
let currentBgm: BgmMode = null
let bgmSchedulerId: number | null = null

let menuState: {
  nextChordTime: number
  chordIndex: number
} | null = null

let battleState: {
  nextBeatTime: number
  beatIndex: number
  hatIndex: number
} | null = null

export function initAudio(): void {
  const ctx = ensureAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

  if (desiredBgm === 'menu') {
    startMenuBgm()
  } else if (desiredBgm === 'battle') {
    startBattleBgm()
  }
}

export function playMenuBgm(): void {
  desiredBgm = 'menu'
  if (!audioContext) return
  startMenuBgm()
}

export function playBattleBgm(): void {
  desiredBgm = 'battle'
  if (!audioContext) return
  startBattleBgm()
}

export function stopBgm(): void {
  desiredBgm = null
  if (!audioContext || !bgmGain) return

  stopScheduler()
  currentBgm = null
  menuState = null
  battleState = null

  const now = audioContext.currentTime
  bgmGain.gain.cancelScheduledValues(now)
  bgmGain.gain.setValueAtTime(bgmGain.gain.value, now)
  bgmGain.gain.linearRampToValueAtTime(0, now + 0.5)
}

export function playSfx(type: SfxType): void {
  const ctx = audioContext
  if (!ctx || !sfxGain || muted) return

  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

  switch (type) {
    case 'click':
      playClickSfx(ctx)
      break
    case 'fire':
      playFireSfx(ctx)
      break
    case 'explosion':
      playExplosionSfx(ctx)
      break
    case 'skill':
      playSkillSfx(ctx)
      break
    case 'purchase':
      playPurchaseSfx(ctx)
      break
    case 'victory':
      playVictorySfx(ctx)
      break
    case 'defeat':
      playDefeatSfx(ctx)
      break
  }
}

export function setMuted(nextMuted: boolean): void {
  muted = nextMuted
  saveMutedState(muted)

  const ctx = audioContext
  if (!ctx || !masterGain) return

  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)
  masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.05)
}

export function isMuted(): boolean {
  return muted
}

function ensureAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  if (typeof window === 'undefined') return null

  const windowWithWebkit = window as Window & {
    webkitAudioContext?: typeof AudioContext
  }
  const Ctor =
    typeof AudioContext !== 'undefined' ? AudioContext : windowWithWebkit.webkitAudioContext
  if (!Ctor) return null

  const ctx = new Ctor()
  audioContext = ctx

  masterGain = ctx.createGain()
  masterGain.gain.value = muted ? 0 : 1
  masterGain.connect(ctx.destination)

  bgmGain = ctx.createGain()
  bgmGain.gain.value = 0
  bgmGain.connect(masterGain)

  sfxGain = ctx.createGain()
  sfxGain.gain.value = SFX_VOLUME
  sfxGain.connect(masterGain)

  noiseBuffer = createNoiseBuffer(ctx)

  return ctx
}

function startMenuBgm(): void {
  const ctx = audioContext
  const bgm = bgmGain
  if (!ctx || !bgm) return
  if (currentBgm === 'menu') return

  stopScheduler()
  currentBgm = 'menu'
  battleState = null

  const now = ctx.currentTime
  bgm.gain.cancelScheduledValues(now)
  bgm.gain.setValueAtTime(bgm.gain.value, now)
  bgm.gain.linearRampToValueAtTime(BGM_VOLUME, now + 0.5)

  menuState = {
    nextChordTime: now + 0.05,
    chordIndex: 0,
  }

  bgmSchedulerId = window.setInterval(() => scheduleMenu(ctx), 250)
}

function startBattleBgm(): void {
  const ctx = audioContext
  const bgm = bgmGain
  if (!ctx || !bgm) return
  if (currentBgm === 'battle') return

  stopScheduler()
  currentBgm = 'battle'
  menuState = null

  const now = ctx.currentTime
  bgm.gain.cancelScheduledValues(now)
  bgm.gain.setValueAtTime(bgm.gain.value, now)
  bgm.gain.linearRampToValueAtTime(BGM_VOLUME, now + 0.35)

  battleState = {
    nextBeatTime: now + 0.05,
    beatIndex: 0,
    hatIndex: 0,
  }

  bgmSchedulerId = window.setInterval(() => scheduleBattle(ctx), 120)
}

function stopScheduler(): void {
  if (bgmSchedulerId !== null) {
    window.clearInterval(bgmSchedulerId)
    bgmSchedulerId = null
  }
}

function scheduleMenu(ctx: AudioContext): void {
  if (!menuState || !bgmGain) return

  const lookAhead = 1.5
  const progression: readonly [number, number, number][] = [
    [220.0, 261.63, 329.63],
    [293.66, 349.23, 440.0],
    [329.63, 392.0, 493.88],
    [220.0, 261.63, 329.63],
  ]

  while (menuState.nextChordTime < ctx.currentTime + lookAhead) {
    const startTime = menuState.nextChordTime
    const chord = progression[menuState.chordIndex % progression.length]!

    playMenuPadChord(ctx, startTime, chord)
    playMenuArp(ctx, startTime, chord)

    menuState.nextChordTime += 4
    menuState.chordIndex += 1
  }
}

function playMenuPadChord(
  ctx: AudioContext,
  startTime: number,
  chord: readonly [number, number, number],
): void {
  const chordGain = ctx.createGain()
  chordGain.gain.setValueAtTime(0, startTime)
  chordGain.gain.linearRampToValueAtTime(0.12, startTime + 1.2)
  chordGain.gain.linearRampToValueAtTime(0.08, startTime + 3.2)
  chordGain.gain.linearRampToValueAtTime(0, startTime + 4)
  chordGain.connect(bgmGain!)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, startTime)
  filter.Q.setValueAtTime(0.7, startTime)
  filter.connect(chordGain)

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(0.15, startTime)
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.setValueAtTime(120, startTime)
  lfo.connect(lfoDepth)
  lfoDepth.connect(filter.frequency)
  safeStart(lfo, startTime)
  safeStop(lfo, startTime + 4.1)
  lfo.onended = () => {
    lfo.disconnect()
    lfoDepth.disconnect()
  }

  const waves: OscillatorType[] = ['triangle', 'sawtooth', 'triangle']
  const detunes = [-7, 0, 7]

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    osc.type = waves[i]!
    osc.frequency.setValueAtTime(chord[i]!, startTime)
    osc.detune.setValueAtTime(detunes[i]!, startTime)
    osc.connect(filter)
    safeStart(osc, startTime)
    safeStop(osc, startTime + 4.05)
    osc.onended = () => osc.disconnect()
  }

  const cleanupAt = Math.max(0, (startTime + 4.2 - ctx.currentTime) * 1000)
  window.setTimeout(() => {
    filter.disconnect()
    chordGain.disconnect()
  }, cleanupAt)
}

function playMenuArp(
  ctx: AudioContext,
  startTime: number,
  chord: readonly [number, number, number],
): void {
  const steps = [0, 1, 2, 1, 0, 2]
  for (let i = 0; i < steps.length; i++) {
    const freq = chord[steps[i]!]! * 2
    const noteTime = startTime + i * (4 / 6)
    playSimpleTone(ctx, {
      frequencyStart: freq,
      duration: 0.22,
      volume: 0.04,
      type: 'triangle',
      destination: bgmGain!,
    }, noteTime)
  }
}

function scheduleBattle(ctx: AudioContext): void {
  if (!battleState || !bgmGain) return

  const bpm = 130
  const beat = 60 / bpm
  const eighth = beat / 2
  const lookAhead = 1.2

  const bassPattern = [110.0, 130.81, 146.83, 164.81]
  const leadPattern = [440.0, 523.25, 493.88, 659.25, 587.33, 523.25, 493.88, 440.0]

  while (battleState.nextBeatTime < ctx.currentTime + lookAhead) {
    const t = battleState.nextBeatTime
    const bassFreq = bassPattern[battleState.beatIndex % bassPattern.length]!
    const leadFreq = leadPattern[battleState.beatIndex % leadPattern.length]!

    playSimpleTone(ctx, {
      frequencyStart: bassFreq,
      duration: beat * 0.9,
      volume: 0.12,
      type: 'square',
      destination: bgmGain,
      lowpass: 520,
    }, t)

    playKick(ctx, t)

    playSimpleTone(ctx, {
      frequencyStart: leadFreq,
      frequencyEnd: leadFreq * 0.98,
      duration: 0.12,
      volume: 0.05,
      type: 'sawtooth',
      destination: bgmGain,
      highpass: 350,
    }, t + eighth)

    playHiHat(ctx, t)
    playHiHat(ctx, t + eighth)

    battleState.nextBeatTime += beat
    battleState.beatIndex += 1
    battleState.hatIndex += 2
  }
}

function playKick(ctx: AudioContext, startTime: number): void {
  const tone = ctx.createOscillator()
  tone.type = 'sine'
  tone.frequency.setValueAtTime(80, startTime)
  tone.frequency.exponentialRampToValueAtTime(55, startTime + 0.08)

  const toneGain = ctx.createGain()
  toneGain.gain.setValueAtTime(0.14, startTime)
  toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.08)

  tone.connect(toneGain)
  toneGain.connect(bgmGain!)

  safeStart(tone, startTime)
  safeStop(tone, startTime + 0.09)
  tone.onended = () => {
    tone.disconnect()
    toneGain.disconnect()
  }

  playNoiseBurst(ctx, {
    destination: bgmGain!,
    startTime,
    duration: 0.08,
    volume: 0.05,
    lowpass: 250,
  })
}

function playHiHat(ctx: AudioContext, startTime: number): void {
  playNoiseBurst(ctx, {
    destination: bgmGain!,
    startTime,
    duration: 0.03,
    volume: 0.03,
    highpass: 6500,
  })
}

function playClickSfx(ctx: AudioContext): void {
  playSimpleTone(ctx, {
    frequencyStart: 800,
    duration: 0.05,
    volume: 0.3,
    type: 'sine',
    destination: sfxGain!,
  })
}

function playFireSfx(ctx: AudioContext): void {
  const now = ctx.currentTime
  playSimpleTone(ctx, {
    frequencyStart: 720,
    frequencyEnd: 220,
    duration: 0.1,
    volume: 0.2,
    type: 'sine',
    destination: sfxGain!,
    highpass: 220,
  }, now)

  playNoiseBurst(ctx, {
    destination: sfxGain!,
    startTime: now,
    duration: 0.1,
    volume: 0.12,
    highpass: 1200,
  })
}

function playExplosionSfx(ctx: AudioContext): void {
  const now = ctx.currentTime
  playSimpleTone(ctx, {
    frequencyStart: 80,
    frequencyEnd: 55,
    duration: 0.3,
    volume: 0.24,
    type: 'sine',
    destination: sfxGain!,
    lowpass: 220,
  }, now)

  playNoiseBurst(ctx, {
    destination: sfxGain!,
    startTime: now,
    duration: 0.3,
    volume: 0.2,
    lowpass: 600,
  })
}

function playSkillSfx(ctx: AudioContext): void {
  playSimpleTone(ctx, {
    frequencyStart: 400,
    frequencyEnd: 1200,
    duration: 0.2,
    volume: 0.28,
    type: 'sine',
    destination: sfxGain!,
    highpass: 250,
  })
}

function playPurchaseSfx(ctx: AudioContext): void {
  const now = ctx.currentTime
  playSimpleTone(ctx, {
    frequencyStart: 523.25,
    duration: 0.15,
    volume: 0.22,
    type: 'triangle',
    destination: sfxGain!,
  }, now)
  playSimpleTone(ctx, {
    frequencyStart: 659.25,
    duration: 0.15,
    volume: 0.22,
    type: 'triangle',
    destination: sfxGain!,
  }, now + 0.16)
}

function playVictorySfx(ctx: AudioContext): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  const now = ctx.currentTime
  for (let i = 0; i < notes.length; i++) {
    playSimpleTone(ctx, {
      frequencyStart: notes[i]!,
      duration: 0.1,
      volume: 0.24,
      type: 'triangle',
      destination: sfxGain!,
      lowpass: 2600,
    }, now + i * 0.11)
  }
}

function playDefeatSfx(ctx: AudioContext): void {
  const notes = [523.25, 466.16, 415.3]
  const now = ctx.currentTime
  for (let i = 0; i < notes.length; i++) {
    playSimpleTone(ctx, {
      frequencyStart: notes[i]!,
      duration: 0.15,
      volume: 0.22,
      type: 'sawtooth',
      destination: sfxGain!,
      lowpass: 1400,
    }, now + i * 0.16)
  }
}

function playSimpleTone(
  ctx: AudioContext,
  options: {
    frequencyStart: number
    frequencyEnd?: number
    duration: number
    volume: number
    type: OscillatorType
    destination: AudioNode
    lowpass?: number
    highpass?: number
  },
  startTime = ctx.currentTime,
): void {
  const osc = ctx.createOscillator()
  osc.type = options.type

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(options.volume, startTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + options.duration)

  let output: AudioNode = gain
  let filter: BiquadFilterNode | null = null

  if (options.lowpass) {
    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(options.lowpass, startTime)
    filter.Q.setValueAtTime(0.7, startTime)
    gain.connect(filter)
    output = filter
  }

  if (options.highpass) {
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(options.highpass, startTime)
    highpass.Q.setValueAtTime(0.8, startTime)

    if (filter) {
      filter.connect(highpass)
    } else {
      gain.connect(highpass)
    }

    output = highpass
  }

  output.connect(options.destination)

  osc.frequency.setValueAtTime(options.frequencyStart, startTime)
  if (options.frequencyEnd) {
    osc.frequency.exponentialRampToValueAtTime(options.frequencyEnd, startTime + options.duration)
  }

  osc.connect(gain)

  safeStart(osc, startTime)
  safeStop(osc, startTime + options.duration + 0.01)

  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
    if (filter) filter.disconnect()
    output.disconnect()
  }
}

function playNoiseBurst(
  ctx: AudioContext,
  options: {
    destination: AudioNode
    startTime: number
    duration: number
    volume: number
    lowpass?: number
    highpass?: number
  },
): void {
  if (!noiseBuffer) {
    noiseBuffer = createNoiseBuffer(ctx)
  }

  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(options.volume, options.startTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, options.startTime + options.duration)

  source.connect(gain)

  let output: AudioNode = gain
  let lowpass: BiquadFilterNode | null = null
  let highpass: BiquadFilterNode | null = null

  if (options.lowpass) {
    lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.setValueAtTime(options.lowpass, options.startTime)
    lowpass.Q.setValueAtTime(0.6, options.startTime)
    output.connect(lowpass)
    output = lowpass
  }

  if (options.highpass) {
    highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(options.highpass, options.startTime)
    highpass.Q.setValueAtTime(0.7, options.startTime)
    output.connect(highpass)
    output = highpass
  }

  output.connect(options.destination)

  source.start(options.startTime)
  source.stop(options.startTime + options.duration)

  source.onended = () => {
    source.disconnect()
    gain.disconnect()
    if (lowpass) lowpass.disconnect()
    if (highpass) highpass.disconnect()
    output.disconnect()
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 1
  const length = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function safeStart(node: OscillatorNode, time: number): void {
  node.start(Math.max(time, 0))
}

function safeStop(node: OscillatorNode, time: number): void {
  node.stop(Math.max(time, 0.01))
}

function loadMutedState(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMutedState(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0')
  } catch {
    // Ignore storage write failures.
  }
}
