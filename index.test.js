import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { lockScrollbars } from './index.js'

describe('lockScrollbars', () => {
  let scrollableDiv

  beforeEach(() => {
    // Create a tall page to enable scrolling
    document.body.style.height = '3000px'
    document.body.style.margin = '0'
    document.documentElement.style.height = '100%'

    // Create a scrollable div for testing
    scrollableDiv = document.createElement('div')
    scrollableDiv.style.cssText =
      'width: 200px; height: 200px; overflow: auto; position: fixed; top: 50px; left: 50px;'
    scrollableDiv.innerHTML =
      '<div style="width: 400px; height: 400px;">Scrollable content</div>'
    document.body.appendChild(scrollableDiv)
  })

  afterEach(() => {
    // Clean up
    document.body.style.height = ''
    document.body.style.margin = ''
    document.body.style.position = ''
    document.body.style.inset = ''
    document.body.style.overflowY = ''
    document.documentElement.style.height = ''
    document.documentElement.style.scrollbarGutter = ''
    scrollableDiv?.remove()
    window.scrollTo(0, 0)
  })

  it('should return an unlock function', () => {
    const unlock = lockScrollbars()
    expect(typeof unlock).toBe('function')
    unlock()
  })

  it('should lock the body scroll by setting position fixed', () => {
    const unlock = lockScrollbars()

    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.overflowY).toBe('hidden')

    unlock()
  })

  it('should restore body styles after unlock', () => {
    const unlock = lockScrollbars()
    unlock()

    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflowY).toBe('')
  })

  it('should set scrollbarGutter to stable when locked', () => {
    const unlock = lockScrollbars()

    expect(document.documentElement.style.scrollbarGutter).toBe('stable')

    unlock()
  })

  it('should preserve scroll position when locking', async () => {
    // Scroll down first
    window.scrollTo(0, 100)

    const unlock = lockScrollbars()

    // Body should be offset to maintain visual position
    expect(document.body.style.inset).toContain('-100px')

    unlock()

    // Wait a frame for scroll restoration
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(window.scrollY).toBe(100)
  })

  it('should allow scrolling on exception node when provided', () => {
    const unlock = lockScrollbars(scrollableDiv)

    // The exception node should have pointer-events enabled via class
    const hasLockClass = Array.from(scrollableDiv.classList).some((c) =>
      c.startsWith('ls')
    )
    expect(hasLockClass).toBe(true)

    unlock()
  })

  it('should remove exception class after unlock', () => {
    const unlock = lockScrollbars(scrollableDiv)
    unlock()

    const hasLockClass = Array.from(scrollableDiv.classList).some((c) =>
      c.startsWith('ls')
    )
    expect(hasLockClass).toBe(false)
  })

  it('should handle multiple nested locks', () => {
    const unlock1 = lockScrollbars()
    const unlock2 = lockScrollbars(scrollableDiv)

    // Second lock should be active
    const hasLockClass = Array.from(scrollableDiv.classList).some((c) =>
      c.startsWith('ls')
    )
    expect(hasLockClass).toBe(true)

    unlock2()

    // First lock should be restored
    expect(document.body.style.position).toBe('fixed')

    unlock1()
  })

  it('should add style element to head when locked', () => {
    const stylesBefore = document.querySelectorAll('head style').length

    const unlock = lockScrollbars()

    const stylesAfter = document.querySelectorAll('head style').length
    expect(stylesAfter).toBeGreaterThan(stylesBefore)

    unlock()
  })

  it('should remove style element after all locks are released', () => {
    const unlock = lockScrollbars()
    unlock()

    // Style element should be removed
    const styles = Array.from(document.querySelectorAll('head style'))
    const lockStyle = styles.find((s) =>
      s.innerHTML.includes('pointer-events: none')
    )
    expect(lockStyle).toBeUndefined()
  })

  it('should block wheel events by preventing default', () => {
    const unlock = lockScrollbars()

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    })

    window.dispatchEvent(wheelEvent)
    expect(wheelEvent.defaultPrevented).toBe(true)

    unlock()
  })

  it('should block scroll-related keyboard events', () => {
    const unlock = lockScrollbars()

    const keys = ['Space', 'PageUp', 'PageDown', 'ArrowDown', 'ArrowUp']

    keys.forEach((key) => {
      const keyEvent = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(keyEvent)
      expect(keyEvent.defaultPrevented).toBe(true)
    })

    unlock()
  })

  it('should not block non-scroll keyboard events', () => {
    const unlock = lockScrollbars()

    const keyEvent = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keyEvent)
    expect(keyEvent.defaultPrevented).toBe(false)

    unlock()
  })
})
