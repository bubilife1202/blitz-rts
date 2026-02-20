import type { CalloutMessage, CalloutPriority } from './types'

const GLOBAL_COOLDOWN = 3
const CATEGORY_COOLDOWN = 8
const DEFAULT_DISPLAY_DURATION = 2.5
const FADE_OUT_DURATION = 0.5

interface ActiveCallout {
  readonly message: CalloutMessage
  remaining: number
  readonly fadeStart: number
}

interface CategoryTimer {
  remaining: number
}

export interface CalloutQueue {
  readonly pending: CalloutMessage[]
  active: ActiveCallout | null
  globalCooldown: number
  readonly categoryCooldowns: Map<CalloutPriority, CategoryTimer>
}

const PRIORITY_ORDER: readonly CalloutPriority[] = [
  'CRITICAL',
  'TACTICAL',
  'REACTION',
  'FLAVOR',
]

export function createCalloutQueue(): CalloutQueue {
  return {
    pending: [],
    active: null,
    globalCooldown: 0,
    categoryCooldowns: new Map(),
  }
}

export function enqueue(queue: CalloutQueue, msg: CalloutMessage): void {
  queue.pending.push(msg)
}

function getCategoryCooldownRemaining(
  queue: CalloutQueue,
  priority: CalloutPriority,
): number {
  const timer = queue.categoryCooldowns.get(priority)
  return timer ? timer.remaining : 0
}

function startCooldowns(queue: CalloutQueue, priority: CalloutPriority): void {
  queue.globalCooldown = GLOBAL_COOLDOWN
  queue.categoryCooldowns.set(priority, { remaining: CATEGORY_COOLDOWN })
}

function tryDequeue(queue: CalloutQueue): CalloutMessage | null {
  if (queue.globalCooldown > 0) return null

  // Process in priority order
  for (const priority of PRIORITY_ORDER) {
    if (getCategoryCooldownRemaining(queue, priority) > 0) continue

    const idx = queue.pending.findIndex(m => m.priority === priority)
    if (idx >= 0) {
      return queue.pending.splice(idx, 1)[0]!
    }
  }
  return null
}

export function updateCalloutQueue(queue: CalloutQueue, dt: number): void {
  // Update cooldowns
  if (queue.globalCooldown > 0) {
    queue.globalCooldown = Math.max(0, queue.globalCooldown - dt)
  }
  for (const [, timer] of queue.categoryCooldowns) {
    if (timer.remaining > 0) {
      timer.remaining = Math.max(0, timer.remaining - dt)
    }
  }

  // Update active callout
  if (queue.active) {
    queue.active.remaining -= dt
    if (queue.active.remaining <= 0) {
      queue.active = null
    }
  }

  // Try to show next callout
  if (!queue.active) {
    const next = tryDequeue(queue)
    if (next) {
      const duration = next.duration > 0 ? next.duration : DEFAULT_DISPLAY_DURATION
      queue.active = {
        message: next,
        remaining: duration + FADE_OUT_DURATION,
        fadeStart: FADE_OUT_DURATION,
      }
      startCooldowns(queue, next.priority)
    }
  }
}

export interface CalloutDisplay {
  readonly message: CalloutMessage
  readonly opacity: number
}

export function getCurrentCallout(queue: CalloutQueue): CalloutDisplay | null {
  if (!queue.active) return null

  const { active } = queue
  let opacity = 1
  if (active.remaining <= active.fadeStart) {
    opacity = Math.max(0, active.remaining / active.fadeStart)
  }

  return { message: active.message, opacity }
}
