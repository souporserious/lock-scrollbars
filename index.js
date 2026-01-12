/** @typedef {{ x: number, y: number }} ScrollPosition */
/** @typedef {{ node: HTMLElement | null, create: () => void, destroy: () => void }} LockedScroll */

/** @type {WeakMap<HTMLElement, ScrollPosition>} */
const scrollCoords = new WeakMap()
/** @type {WeakMap<HTMLElement, number>} */
const scrollRafIds = new WeakMap()

/** @param {HTMLElement} node */
function lockScroll(node) {
  const scrollElementCoords = scrollCoords.get(node)
  if (scrollElementCoords) {
    node.scrollLeft = scrollElementCoords.x
    node.scrollTop = scrollElementCoords.y
  }
  const id = requestAnimationFrame(() => lockScroll(node))
  scrollRafIds.set(node, id)
}

/** @param {HTMLElement} node */
function cancelLockScroll(node) {
  const id = scrollRafIds.get(node)
  if (id) {
    // wait one frame before canceling to prevent scrollbar jump
    requestAnimationFrame(() => cancelAnimationFrame(id))
    scrollRafIds.delete(node)
  }
}

/**
 * @param {HTMLElement | null} node
 * @returns {HTMLElement[]}
 */
function getScrollableElements(node) {
  if (!node) return [] // Optimization: Don't scan the whole document if locking globally
  /**
   * @param {Element} el
   * @returns {el is HTMLElement}
   */
  const isScrollableHTMLElement = (el) => {
    if (!(el instanceof HTMLElement)) return false
    const computedStyle = window.getComputedStyle(el)
    const overflow = computedStyle.getPropertyValue('overflow')
    const overflowX = computedStyle.getPropertyValue('overflow-x')
    const overflowY = computedStyle.getPropertyValue('overflow-y')
    return (
      overflow === 'auto' ||
      overflow === 'scroll' ||
      overflowX === 'auto' ||
      overflowX === 'scroll' ||
      overflowY === 'auto' ||
      overflowY === 'scroll'
    )
  }

  return Array.from(node.querySelectorAll('*')).filter(isScrollableHTMLElement)
}

/** @param {KeyboardEvent} event */
function preventScrollKeys(event) {
  const scrollKeys = [
    'Space',
    'PageUp',
    'PageDown',
    'End',
    'Home',
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
  ]
  if (scrollKeys.includes(event.key)) {
    event.preventDefault()
  }
}

/** @param {HTMLElement} node */
const getCanScrollX = (node) => node.scrollWidth > node.clientWidth
/** @param {HTMLElement} node */
const getCanScrollY = (node) => node.scrollHeight > node.clientHeight
/** @param {Event} event */
const preventDefault = (event) => event.preventDefault()

/** @type {HTMLStyleElement | undefined} */
let style
/** @type {LockedScroll[]} */
let lockedScrolls = []

/**
 * Lock all scrollbars by disabling mousewheel and locking scrollbars in position.
 * Optionally provide a specific element to allow scrolling.
 * @param {HTMLElement|null} node - The DOM element to allow scrolling on hover.
 * @returns {() => void} - Function to unlock the scrollbars.
 */
export function lockScrollbars(node = null) {
  // Check if already locked to prevent jumping to 0 on nested locks
  const isAlreadyLocked = document.body.style.position === 'fixed'

  const scrollY = isAlreadyLocked
    ? Math.abs(parseInt(document.body.style.top || '0', 10))
    : window.scrollY

  const scrollX = isAlreadyLocked
    ? Math.abs(parseInt(document.body.style.left || '0', 10))
    : window.scrollX

  // If there’s already a lock in place, tear down the topmost one first
  // We do this BEFORE setting styles to ensure clean state transition
  if (lockedScrolls.length > 0) {
    lockedScrolls[lockedScrolls.length - 1].destroy()
    lockedScrolls = lockedScrolls.filter(
      (ls) => !ls.node || document.body.contains(ls.node)
    )
  }

  document.documentElement.style.scrollbarGutter = 'stable'
  document.body.style.overflowY = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.inset = `-${scrollY}px 0 0 -${scrollX}px`

  /** @type {AbortController | null} */
  let outsideEventsController = null

  const enableOutsideBlocking = () => {
    if (outsideEventsController) return // Already active
    outsideEventsController = new AbortController()

    window.addEventListener('wheel', preventDefault, {
      capture: true,
      passive: false,
      signal: outsideEventsController.signal,
    })
    window.addEventListener('keydown', preventScrollKeys, {
      capture: true,
      passive: false,
      signal: outsideEventsController.signal,
    })
  }

  const disableOutsideBlocking = () => {
    if (outsideEventsController) {
      outsideEventsController.abort()
      outsideEventsController = null
    }
  }

  const mouseOver = () => {
    // User is hovering the exception node; allow local scrolling
    disableOutsideBlocking()
  }

  const mouseOut = () => {
    // User left the exception node; block global scrolling
    enableOutsideBlocking()
  }

  /** @param {MouseEvent} event */
  const mouseDown = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target !== node) {
      scrollCoords.set(target, {
        x: target.scrollLeft,
        y: target.scrollTop,
      })
      lockScroll(target)
    }
  }

  /** @param {MouseEvent} event */
  const mouseUp = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    cancelLockScroll(target)
    scrollCoords.delete(target)
  }

  /** @param {WheelEvent} event */
  const wheelLock = (event) => {
    if (!node) return

    const scrollableDistance = node.scrollHeight - node.offsetHeight
    const target = event.target
    const isTarget = node === target
    const isChildOfTarget =
      target instanceof Node ? node.contains(target) : false

    if (scrollableDistance > 0 && !isTarget && isChildOfTarget) {
      return
    }

    if (
      isTarget ||
      (event.deltaY > 0 && node.scrollTop >= scrollableDistance) ||
      (event.deltaY < 0 && node.scrollTop <= 0)
    ) {
      event.preventDefault()
    }
  }

  const scrollables = getScrollableElements(node)
  const lifecycleController = new AbortController()
  /** @type {string | undefined} */
  let className

  function create() {
    // Setup global listeners that persist for the life of the lock
    window.addEventListener('mousedown', mouseDown, {
      capture: true,
      signal: lifecycleController.signal,
    })
    window.addEventListener('mouseup', mouseUp, {
      capture: true,
      signal: lifecycleController.signal,
    })

    // Setup exception node logic
    if (node) {
      node.addEventListener('mouseover', mouseOver, {
        capture: true,
        signal: lifecycleController.signal,
      })
      node.addEventListener('mouseout', mouseOut, {
        capture: true,
        signal: lifecycleController.signal,
      })

      // Also listen for wheel on window to handle edge cases (overscroll)
      window.addEventListener('wheel', wheelLock, {
        capture: true,
        passive: false,
        signal: lifecycleController.signal,
      })

      // Initially block outside interactions until hovered
      mouseOut()
    } else {
      // If no node provided, just block everything immediately and permanently
      enableOutsideBlocking()
    }

    const shouldCreateStyle = style === undefined
    const styleEl = style ?? document.createElement('style')
    if (style === undefined) style = styleEl

    // set touch-action on all scrollables so they don't flicker/overscroll
    scrollables.forEach((scrollableNode) => {
      const canScrollX = getCanScrollX(scrollableNode)
      const canScrollY = getCanScrollY(scrollableNode)
      let touchAction = 'none'

      if (canScrollX && canScrollY) {
        touchAction = 'auto'
      } else if (canScrollX) {
        touchAction = 'pan-x'
      } else if (canScrollY) {
        touchAction = 'pan-y'
      }

      scrollableNode.style.touchAction = touchAction
    })

    const styles = `
* {
  pointer-events: none;
}

*, ::backdrop {
  touch-action: none;
}
`.trim()

    if (node) {
      const canScrollX = getCanScrollX(node)
      const canScrollY = getCanScrollY(node)
      let touchAction = 'none'

      if (canScrollX && canScrollY) {
        touchAction = 'auto'
      } else if (canScrollX) {
        touchAction = 'pan-x'
      } else if (canScrollY) {
        touchAction = 'pan-y'
      }

      className = `ls${Math.random().toString(36).slice(2)}`
      node.classList.add(className)
      styleEl.innerHTML = `
${styles}

.${className}, .${className} * {
  pointer-events: auto;
  overscroll-behavior: contain;
  touch-action: ${touchAction};
}
`.trim()
    } else {
      styleEl.innerHTML = styles
    }

    if (shouldCreateStyle) {
      document.head.appendChild(styleEl)
    }
  }

  function destroy() {
    lifecycleController.abort()
    disableOutsideBlocking()

    if (node) {
      if (className) node.classList.remove(className)
    }

    scrollables.forEach((scrollableNode) => {
      scrollableNode.style.touchAction = ''
    })
  }

  // add our new lock
  if (!node || document.body.contains(node)) {
    lockedScrolls.push({ node, create, destroy })
    create()
  }

  // re-create on orientation change
  const orientationMediaQuery = window.matchMedia('(orientation: portrait)')
  orientationMediaQuery.onchange = () => {
    destroy()
    create()
  }

  return () => {
    const index = lockedScrolls.findIndex(
      (lockedScroll) => lockedScroll.node === node
    )

    if (index > -1) {
      orientationMediaQuery.onchange = null

      destroy()
      lockedScrolls.splice(index, 1)

      // again, filter any nodes that may be gone from the DOM now
      lockedScrolls = lockedScrolls.filter((lockedScroll) => {
        const containsLockedScrollNode =
          !lockedScroll.node || document.body.contains(lockedScroll.node)

        // as a side effect, make sure to remove listeners from this node
        if (containsLockedScrollNode === false) {
          lockedScroll.destroy()
        }
        return containsLockedScrollNode
      })

      // enable the previous scroll lock if any are left
      if (lockedScrolls.length > 0) {
        lockedScrolls[lockedScrolls.length - 1].create()
      }
    }

    // if no more locks, remove our style element and restore padding
    if (lockedScrolls.length === 0) {
      style?.remove()
      style = undefined

      // clean up styles
      document.body.style.position = ''
      document.body.style.inset = ''
      document.body.style.overflowY = ''

      // restore scroll position
      window.scroll(scrollX, scrollY)

      // wait one frame before removing the scrollbar gutter to prevent scrollbar jump
      requestAnimationFrame(() => {
        document.documentElement.style.scrollbarGutter = ''
      })
    }
  }
}
