import type { DialogueEmotion } from '../coop/types'

export interface DialogueEntry {
  readonly speaker: string
  readonly emotion: DialogueEmotion
  readonly text: string
}

export interface DialogueUiHandle {
  destroy(): void
}

// ── Speaker colors ──

const SPEAKER_COLORS: Record<string, string> = {
  'LUNA-5': '#4FC3F7',
  'KAI-7': '#FF8A65',
  'ZERO-9': '#66BB6A',
  'MIRA-3': '#BA68C8',
  'Commander': '#FFD54F',
}

const DEFAULT_SPEAKER_COLOR = '#90A4AE'

function getSpeakerColor(speaker: string): string {
  return SPEAKER_COLORS[speaker] ?? DEFAULT_SPEAKER_COLOR
}

// ── Emotion emoji ──

const EMOTION_EMOJI: Record<DialogueEmotion, string> = {
  neutral: '',
  happy: '\u{1F60A}',
  angry: '\u{1F4A2}',
  worried: '\u{1F630}',
  excited: '\u{2728}',
  confident: '\u{1F4AA}',
  calm: '\u{1F9CA}',
  sad: '\u{1F622}',
}

// ── Constants ──

const CHARS_PER_SEC = 30

export function createDialogueUi(
  container: HTMLElement,
  dialogues: readonly DialogueEntry[],
  onComplete: () => void,
): DialogueUiHandle {
  let currentIndex = 0
  let charIndex = 0
  let typewriterTimer: ReturnType<typeof setInterval> | null = null
  let destroyed = false

  // ── Root overlay ──

  const overlay = document.createElement('div')
  overlay.className = 'dialogue-overlay'

  const box = document.createElement('div')
  box.className = 'dialogue-box panel'

  // ── Inner layout: portrait + content ──

  const inner = document.createElement('div')
  inner.className = 'dialogue-inner'

  // Portrait
  const portrait = document.createElement('div')
  portrait.className = 'dialogue-portrait'
  const portraitLetter = document.createElement('span')
  portraitLetter.className = 'dialogue-portrait-letter'
  portrait.appendChild(portraitLetter)

  // Content column
  const content = document.createElement('div')
  content.className = 'dialogue-content'

  // Speaker row (name + emotion)
  const speakerRow = document.createElement('div')
  speakerRow.className = 'dialogue-speaker-row'

  const speakerEl = document.createElement('span')
  speakerEl.className = 'dialogue-speaker'

  const emotionEl = document.createElement('span')
  emotionEl.className = 'dialogue-emotion'

  speakerRow.appendChild(speakerEl)
  speakerRow.appendChild(emotionEl)

  // Text area with cursor
  const textWrap = document.createElement('div')
  textWrap.className = 'dialogue-text'

  const textEl = document.createElement('span')
  textEl.className = 'dialogue-text-content'

  const cursorEl = document.createElement('span')
  cursorEl.className = 'dialogue-cursor'
  cursorEl.textContent = '|'

  textWrap.appendChild(textEl)
  textWrap.appendChild(cursorEl)

  // Bottom row (progress + hint)
  const bottomRow = document.createElement('div')
  bottomRow.className = 'dialogue-bottom'

  const progressEl = document.createElement('div')
  progressEl.className = 'dialogue-progress'

  const hintEl = document.createElement('div')
  hintEl.className = 'dialogue-hint muted mono'

  bottomRow.appendChild(progressEl)
  bottomRow.appendChild(hintEl)

  // Assemble
  content.appendChild(speakerRow)
  content.appendChild(textWrap)

  inner.appendChild(portrait)
  inner.appendChild(content)

  box.appendChild(inner)
  box.appendChild(bottomRow)
  overlay.appendChild(box)
  container.appendChild(overlay)

  // ── Build progress dots ──

  function buildProgressDots(): void {
    progressEl.textContent = ''
    for (let i = 0; i < dialogues.length; i++) {
      const dot = document.createElement('span')
      dot.className = 'dialogue-dot'
      if (i < currentIndex) dot.classList.add('dialogue-dot--done')
      if (i === currentIndex) dot.classList.add('dialogue-dot--active')
      progressEl.appendChild(dot)
    }
  }

  // ── Update hint ──

  function updateHint(): void {
    const counter = `${currentIndex + 1}/${dialogues.length}`
    hintEl.textContent = `${counter}  Click / Space \u25B8`
  }

  // ── Typewriter helpers ──

  function stopTypewriter(): void {
    if (typewriterTimer !== null) {
      clearInterval(typewriterTimer)
      typewriterTimer = null
    }
  }

  function showEntry(index: number): void {
    const entry = dialogues[index]
    if (!entry) return

    const color = getSpeakerColor(entry.speaker)

    // Portrait
    portraitLetter.textContent = entry.speaker.charAt(0)
    portrait.style.setProperty('--portrait-color', color)

    // Bounce animation
    portrait.classList.remove('dialogue-portrait-bounce')
    // Force reflow to restart animation
    void portrait.offsetWidth
    portrait.classList.add('dialogue-portrait-bounce')

    // Speaker name
    speakerEl.textContent = entry.speaker
    speakerEl.style.color = color

    // Emotion icon
    const emoji = EMOTION_EMOJI[entry.emotion]
    emotionEl.textContent = emoji

    // Reset text
    charIndex = 0
    textEl.textContent = ''
    cursorEl.classList.remove('dialogue-cursor--idle')

    // Progress
    buildProgressDots()
    updateHint()

    // Start typewriter
    stopTypewriter()
    const interval = 1000 / CHARS_PER_SEC
    typewriterTimer = setInterval(() => {
      if (destroyed) {
        stopTypewriter()
        return
      }
      charIndex++
      textEl.textContent = entry.text.slice(0, charIndex)
      if (charIndex >= entry.text.length) {
        stopTypewriter()
        cursorEl.classList.add('dialogue-cursor--idle')
      }
    }, interval)
  }

  // ── Advance ──

  function advance(): void {
    if (destroyed) return

    const entry = dialogues[currentIndex]
    if (!entry) return

    // If typewriter is still running, skip to full text
    if (typewriterTimer !== null) {
      stopTypewriter()
      textEl.textContent = entry.text
      cursorEl.classList.add('dialogue-cursor--idle')
      return
    }

    // Move to next entry
    currentIndex++
    if (currentIndex >= dialogues.length) {
      destroy()
      onComplete()
      return
    }

    showEntry(currentIndex)
  }

  // ── Input ──

  function onKeydown(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault()
      advance()
    }
  }

  overlay.addEventListener('click', advance)
  document.addEventListener('keydown', onKeydown)

  // Show first entry
  if (dialogues.length > 0) {
    showEntry(0)
  } else {
    onComplete()
  }

  // ── Cleanup ──

  function destroy(): void {
    if (destroyed) return
    destroyed = true
    stopTypewriter()
    document.removeEventListener('keydown', onKeydown)
    overlay.remove()
  }

  return { destroy }
}
