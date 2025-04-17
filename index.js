const scrollCoords = new WeakMap()
let rafId

/** @param {HTMLElement} node */
function lockScroll(node) {
  const scrollElementCoords = scrollCoords.get(node)
  if (scrollElementCoords) {
    node.scrollLeft = scrollElementCoords.x
    node.scrollTop = scrollElementCoords.y
  }
  rafId = requestAnimationFrame(() => lockScroll(node))
}

function cancelLockScroll() {
  // wait one frame before canceling the scroll lock to prevent scrollbar jump
  requestAnimationFrame(() => cancelAnimationFrame(rafId))
}

function getScrollableElements(node) {
  return Array.from((node || document).querySelectorAll('*')).filter((node) => {
    const computedStyle = window.getComputedStyle(node)
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
  })
}

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

const getCanScrollX = (node) => node.scrollWidth > node.clientWidth
const getCanScrollY = (node) => node.scrollHeight > node.clientHeight
const preventDefault = (event) => event.preventDefault()

/** @type {HTMLStyleElement} */
let style
let lockedScrolls = []
let originalBodyPaddingRight = ''

/**
 * Lock all scrollbars by disabling mousewheel and locking scrollbars in position.
 * Optionally provide a specific element to allow scrolling.
 * @param {HTMLElement|null} node - The DOM element to allow scrolling on hover.
 * @returns {() => void} - Function to unlock the scrollbars.
 */
function lockScrollbars(node = null) {
  // measure native scrollbar and apply padding to avoid layout shift
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth
  if (originalBodyPaddingRight === '') {
    originalBodyPaddingRight = document.body.style.paddingRight || ''
  }
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  const wheelKeydownEventsController = new AbortController()
  const mouseOver = () => {
    wheelKeydownEventsController.abort()
  }
  const mouseOut = () => {
    window.addEventListener('wheel', preventDefault, {
      capture: true,
      passive: false,
      signal: wheelKeydownEventsController.signal,
    })
    window.addEventListener('keydown', preventScrollKeys, {
      capture: true,
      passive: false,
      signal: wheelKeydownEventsController.signal,
    })
  }
  const mouseDown = (event) => {
    if (event.target !== node) {
      scrollCoords.set(event.target, {
        x: event.target.scrollLeft,
        y: event.target.scrollTop,
      })
      lockScroll(event.target)
    }
  }
  const mouseUp = (event) => {
    cancelLockScroll()
    scrollCoords.delete(event.target)
  }
  const wheelLock = (event) => {
    const scrollableDistance = node.scrollHeight - node.offsetHeight
    const isTarget = node === event.target
    const isChildOfTarget = node.contains(event.target)

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
  const eventController = new AbortController()
  let className

  function create() {
    // make sure wheel/keys are blocked unless hovered on the exception node
    if (node) {
      node.addEventListener('mouseover', mouseOver, {
        capture: true,
        signal: eventController.signal,
      })
      node.addEventListener('mouseout', mouseOut, {
        capture: true,
        signal: eventController.signal,
      })
      mouseOut()
    }
    window.addEventListener('mousedown', mouseDown, {
      capture: true,
      signal: eventController.signal,
    })
    window.addEventListener('mouseup', mouseUp, {
      capture: true,
      signal: eventController.signal,
    })
    window.addEventListener('wheel', wheelLock, {
      capture: true,
      passive: false,
      signal: eventController.signal,
    })
    window.addEventListener('keydown', preventScrollKeys, {
      capture: true,
      passive: false,
      signal: eventController.signal,
    })

    const shouldCreateStyle = style === undefined

    if (shouldCreateStyle) {
      style = document.createElement('style')
    }

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
*, ::backdrop {
  touch-action: none;
}

html, body {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar, body::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
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
      style.innerHTML = `
${styles}

.${className}, .${className} * {
  overscroll-behavior: contain;
  touch-action: ${touchAction};
}
`.trim()
    } else {
      style.innerHTML = styles
    }

    if (shouldCreateStyle) {
      document.head.appendChild(style)
    }
  }

  function destroy() {
    eventController.abort()

    if (node) {
      mouseOver()
      node.classList.remove(className)
    }

    scrollables.forEach((scrollableNode) => {
      scrollableNode.style.touchAction = ''
    })
  }

  // if there’s already a lock in place, tear down the topmost one first
  if (lockedScrolls.length > 0) {
    lockedScrolls[lockedScrolls.length - 1].destroy()
    lockedScrolls = lockedScrolls.filter((ls) =>
      document.body.contains(ls.node)
    )
  }

  // add our new lock
  if (document.body.contains(node)) {
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
      orientationMediaQuery.onchange = undefined

      destroy()
      lockedScrolls.splice(index, 1)

      // again, filter any nodes that may be gone from the DOM now
      lockedScrolls = lockedScrolls.filter((lockedScroll) => {
        const containsLockedScrollNode = document.body.contains(
          lockedScroll.node
        )
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
      style.remove()
      style = undefined
      document.body.style.paddingRight = originalBodyPaddingRight
      originalBodyPaddingRight = ''
    }
  }
}

module.exports = { lockScrollbars }
