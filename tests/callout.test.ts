import { describe, it, expect } from 'vitest'
import { createCalloutQueue, enqueue, updateCalloutQueue, getCurrentCallout } from '../src/coop/callout-queue'
import type { CalloutMessage } from '../src/coop/types'

function makeCallout(overrides?: Partial<CalloutMessage>): CalloutMessage {
  return {
    speaker: 'vanguard',
    text: 'Test callout!',
    priority: 'TACTICAL',
    duration: 2.5,
    ...overrides,
  }
}

describe('CalloutQueue', () => {
  it('creates empty queue', () => {
    const q = createCalloutQueue()
    expect(q.pending).toHaveLength(0)
    expect(q.active).toBeNull()
    expect(getCurrentCallout(q)).toBeNull()
  })

  it('enqueues messages', () => {
    const q = createCalloutQueue()
    enqueue(q, makeCallout())
    expect(q.pending).toHaveLength(1)
  })

  it('dequeues on update', () => {
    const q = createCalloutQueue()
    enqueue(q, makeCallout())
    updateCalloutQueue(q, 0.016)
    expect(q.active).not.toBeNull()
    expect(q.pending).toHaveLength(0)
  })

  it('getCurrentCallout returns active message', () => {
    const q = createCalloutQueue()
    enqueue(q, makeCallout({ text: 'Hello!' }))
    updateCalloutQueue(q, 0.016)
    const display = getCurrentCallout(q)
    expect(display).not.toBeNull()
    expect(display!.message.text).toBe('Hello!')
    expect(display!.opacity).toBeCloseTo(1)
  })

  it('respects global cooldown', () => {
    const q = createCalloutQueue()
    enqueue(q, makeCallout({ text: 'First' }))
    updateCalloutQueue(q, 0.016) // activates first
    // Expire first callout + wait out global (3s) and category (8s) cooldowns
    updateCalloutQueue(q, 10)
    // Now enqueue another with different priority to avoid category cooldown
    enqueue(q, makeCallout({ text: 'Second', priority: 'CRITICAL' }))
    updateCalloutQueue(q, 0.016)
    const display = getCurrentCallout(q)
    expect(display).not.toBeNull()
    expect(display!.message.text).toBe('Second')
  })

  it('CRITICAL priority dequeues before FLAVOR', () => {
    const q = createCalloutQueue()
    enqueue(q, makeCallout({ text: 'Flavor', priority: 'FLAVOR' }))
    enqueue(q, makeCallout({ text: 'Critical', priority: 'CRITICAL' }))
    updateCalloutQueue(q, 0.016)
    const display = getCurrentCallout(q)
    expect(display!.message.text).toBe('Critical')
  })

  it('callout fades out near end', () => {
    const q = createCalloutQueue()
    enqueue(q, makeCallout({ duration: 1 }))
    updateCalloutQueue(q, 0.016) // activate
    // Advance close to expiry: 1s duration + 0.5s fade = 1.5s total
    updateCalloutQueue(q, 1.3)
    const display = getCurrentCallout(q)
    expect(display).not.toBeNull()
    expect(display!.opacity).toBeLessThan(1)
  })
})
