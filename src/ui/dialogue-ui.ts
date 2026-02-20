export interface DialogueEntry {
  readonly speaker: string
  readonly emotion: 'neutral' | 'happy' | 'angry' | 'worried' | 'excited'
  readonly text: string
}

export interface DialogueUiHandle {
  destroy(): void
}

const EMOTION_EMOJI: Record<DialogueEntry['emotion'], string> = {
  neutral: '',
  happy: '\u{1F60A}',
  angry: '\u{1F620}',
  worried: '\u{1F61F}',
  excited: '\u{1F525}',
}

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

  const overlay = document.createElement('div')
  overlay.className = 'dialogue-overlay'

  const box = document.createElement('div')
  box.className = 'dialogue-box panel'

  const speakerEl = document.createElement('div')
  speakerEl.className = 'dialogue-speaker'

  const textEl = document.createElement('div')
  textEl.className = 'dialogue-text'

  const hintEl = document.createElement('div')
  hintEl.className = 'dialogue-hint muted mono'
  hintEl.textContent = 'Click / Space'

  box.appendChild(speakerEl)
  box.appendChild(textEl)
  box.appendChild(hintEl)
  overlay.appendChild(box)
  container.appendChild(overlay)

  function stopTypewriter(): void {
    if (typewriterTimer !== null) {
      clearInterval(typewriterTimer)
      typewriterTimer = null
    }
  }

  function showEntry(index: number): void {
    const entry = dialogues[index]
    if (!entry) return

    const emoji = EMOTION_EMOJI[entry.emotion]
    speakerEl.textContent = emoji ? `${entry.speaker} ${emoji}` : entry.speaker

    charIndex = 0
    textEl.textContent = ''

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
      }
    }, interval)
  }

  function advance(): void {
    if (destroyed) return

    const entry = dialogues[currentIndex]
    if (!entry) return

    // If typewriter is still running, skip to full text
    if (typewriterTimer !== null) {
      stopTypewriter()
      textEl.textContent = entry.text
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

  function destroy(): void {
    if (destroyed) return
    destroyed = true
    stopTypewriter()
    document.removeEventListener('keydown', onKeydown)
    overlay.remove()
  }

  return { destroy }
}
