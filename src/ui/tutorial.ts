const TUTORIAL_DONE_KEY = 'blitz-rts-tutorial-done'

export type TutorialPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center'

export interface TutorialStep {
  readonly message: string
  readonly title?: string
  readonly target?: string
  readonly placement?: TutorialPlacement
  readonly advanceOn?: {
    readonly selector: string
    readonly event?: keyof HTMLElementEventMap
  }
}

type Cleanup = () => void

let activeCleanup: Cleanup | null = null

export function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_DONE_KEY) === '1'
}

export function resetTutorial(): void {
  localStorage.removeItem(TUTORIAL_DONE_KEY)
}

export function showOverlayTutorial(steps: TutorialStep[], onComplete: () => void): void {
  if (steps.length === 0) {
    onComplete()
    return
  }

  activeCleanup?.()

  const overlay = document.createElement('div')
  overlay.className = 'tutorial-overlay tutorial-fade-in'

  const tooltip = document.createElement('div')
  tooltip.className = 'tutorial-tooltip'

  const title = document.createElement('h3')
  title.className = 'tutorial-title'
  const body = document.createElement('p')
  body.className = 'tutorial-body'
  const arrow = document.createElement('div')
  arrow.className = 'tutorial-arrow'

  const actions = document.createElement('div')
  actions.className = 'tutorial-actions'
  const skipBtn = document.createElement('button')
  skipBtn.type = 'button'
  skipBtn.className = 'btn btn-ghost'
  skipBtn.textContent = '건너뛰기'
  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.className = 'btn btn-primary'
  actions.append(skipBtn, nextBtn)

  tooltip.append(title, body, actions)
  overlay.append(tooltip, arrow)
  document.body.appendChild(overlay)

  let index = 0
  let currentHighlight: HTMLElement | null = null
  let stepCleanup: Cleanup | null = null

  const clearHighlight = (): void => {
    if (!currentHighlight) return
    currentHighlight.classList.remove('tutorial-highlight')
    currentHighlight = null
  }

  const resolveTarget = (selector?: string): HTMLElement | null => {
    if (!selector) return null
    return document.querySelector<HTMLElement>(selector)
  }

  const placeTooltip = (target: HTMLElement | null, placement: TutorialPlacement): void => {
    const margin = 14
    const rect = target?.getBoundingClientRect()
    const tipRect = tooltip.getBoundingClientRect()
    let left = window.innerWidth / 2 - tipRect.width / 2
    let top = window.innerHeight / 2 - tipRect.height / 2

    arrow.style.display = rect && placement !== 'center' ? 'block' : 'none'

    if (rect) {
      if (placement === 'top') {
        left = rect.left + rect.width / 2 - tipRect.width / 2
        top = rect.top - tipRect.height - margin
      }
      if (placement === 'bottom') {
        left = rect.left + rect.width / 2 - tipRect.width / 2
        top = rect.bottom + margin
      }
      if (placement === 'left') {
        left = rect.left - tipRect.width - margin
        top = rect.top + rect.height / 2 - tipRect.height / 2
      }
      if (placement === 'right') {
        left = rect.right + margin
        top = rect.top + rect.height / 2 - tipRect.height / 2
      }

      left = Math.max(12, Math.min(window.innerWidth - tipRect.width - 12, left))
      top = Math.max(12, Math.min(window.innerHeight - tipRect.height - 12, top))

      if (placement !== 'center') {
        const arrowSize = 14
        let arrowLeft = rect.left + rect.width / 2 - arrowSize / 2
        let arrowTop = rect.top + rect.height / 2 - arrowSize / 2
        let rotate = '45deg'
        if (placement === 'top') {
          arrowTop = top + tipRect.height - arrowSize / 2
          rotate = '225deg'
        } else if (placement === 'bottom') {
          arrowTop = top - arrowSize / 2
          rotate = '45deg'
        } else if (placement === 'left') {
          arrowLeft = left + tipRect.width - arrowSize / 2
          rotate = '315deg'
        } else if (placement === 'right') {
          arrowLeft = left - arrowSize / 2
          rotate = '135deg'
        }
        arrow.style.left = `${Math.max(8, Math.min(window.innerWidth - arrowSize - 8, arrowLeft))}px`
        arrow.style.top = `${Math.max(8, Math.min(window.innerHeight - arrowSize - 8, arrowTop))}px`
        arrow.style.transform = `rotate(${rotate})`
      }
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }

  const finish = (): void => {
    stepCleanup?.()
    clearHighlight()
    overlay.classList.remove('tutorial-fade-in')
    overlay.classList.add('tutorial-fade-out')
    window.removeEventListener('resize', relayout)
    window.removeEventListener('scroll', relayout, true)
    activeCleanup = null
    window.setTimeout(() => {
      overlay.remove()
      onComplete()
    }, 180)
  }

  const next = (): void => {
    index += 1
    if (index >= steps.length) {
      finish()
      return
    }
    renderStep()
  }

  const relayout = (): void => {
    const step = steps[index]
    if (!step) return
    const target = resolveTarget(step.target)
    placeTooltip(target, step.placement ?? 'bottom')
  }

  const renderStep = (): void => {
    stepCleanup?.()
    stepCleanup = null
    clearHighlight()

    const step = steps[index]
    if (!step) return

    title.textContent = step.title ?? `튜토리얼 ${index + 1}/${steps.length}`
    body.textContent = step.message
    nextBtn.textContent = index === steps.length - 1 ? '확인' : '다음'

    const target = resolveTarget(step.target)
    if (target) {
      currentHighlight = target
      target.classList.add('tutorial-highlight')
    }

    placeTooltip(target, step.placement ?? 'bottom')

    if (step.advanceOn) {
      const listenTarget = resolveTarget(step.advanceOn.selector)
      if (listenTarget) {
        const eventName = step.advanceOn.event ?? 'click'
        const handler = (): void => next()
        listenTarget.addEventListener(eventName, handler, { once: true })
        stepCleanup = () => listenTarget.removeEventListener(eventName, handler)
      }
    }
  }

  nextBtn.addEventListener('click', next)
  skipBtn.addEventListener('click', finish)

  window.addEventListener('resize', relayout)
  window.addEventListener('scroll', relayout, true)

  activeCleanup = (): void => {
    stepCleanup?.()
    clearHighlight()
    overlay.remove()
    window.removeEventListener('resize', relayout)
    window.removeEventListener('scroll', relayout, true)
  }

  renderStep()
}

export function showQuickGuide(container: HTMLElement): void {
  activeCleanup?.()

  const overlay = document.createElement('div')
  overlay.className = 'tutorial-overlay tutorial-fade-in'

  const card = document.createElement('div')
  card.className = 'tutorial-tooltip tutorial-modal'
  card.innerHTML = `
    <h3 class="tutorial-title">게임 설명</h3>
    <div class="tutorial-body tutorial-rich-text">
      <p>BLITZ RTS는 로봇 조립 전략 게임입니다.</p>
      <p>1. 로봇 파츠를 조합해 나만의 메카를 만들고</p>
      <p>2. 스킬을 골라 전장에 출격시키면</p>
      <p>3. 로봇들이 자동으로 전투합니다</p>
      <p>4. 스킬 타이밍이 승패를 가릅니다!</p>
      <p>먼저 상대할 적을 선택하세요.</p>
      <p class="tutorial-flow mono">메인 메뉴: 적 선택 → 조립실: 로봇 3대 조립 → 스킬 3개 선택 → 출격 → 전투 → 결과</p>
    </div>
  `

  const actions = document.createElement('div')
  actions.className = 'tutorial-actions'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'btn btn-primary'
  closeBtn.textContent = '확인'
  actions.appendChild(closeBtn)
  card.appendChild(actions)

  overlay.appendChild(card)
  container.appendChild(overlay)

  const close = (): void => {
    overlay.classList.remove('tutorial-fade-in')
    overlay.classList.add('tutorial-fade-out')
    activeCleanup = null
    window.setTimeout(() => overlay.remove(), 180)
  }

  closeBtn.addEventListener('click', close)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close()
  })

  activeCleanup = (): void => {
    overlay.remove()
  }
}

export function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_DONE_KEY, '1')
}
