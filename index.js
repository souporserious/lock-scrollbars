let rafId
const scrollCoords = new WeakMap()
/** @param {HTMLElement} node */
const lockScroll = (node) => {
  const scrollElementCoords = scrollCoords.get(node)
  if (scrollElementCoords) {
    node.scrollLeft = scrollElementCoords.x
    node.scrollTop = scrollElementCoords.y
  }
  rafId = requestAnimationFrame(() => lockScroll(node))
}
const cancelLockScroll = () => {
  // wait one frame before canceling the scroll lock to prevent scrollbar jump
  requestAnimationFrame(() => cancelAnimationFrame(rafId))
}
const getCanScrollX = (node) => node.scrollWidth > node.clientWidth
const getCanScrollY = (node) => node.scrollHeight > node.clientHeight
const preventDefault = (event) => event.preventDefault()
const preventScrollKeys = (event) => {
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
/** @type {HTMLStyleElement} */
let style
let lockedScrolls = []

/**
 * Lock all scrollbars by disabling mousewheel and locking scrollbars in position.
 * Optionally provide a specific element to allow scrolling.
 * @param {HTMLElement|null} node - The DOM element to allow scrolling on hover.
 * @returns {() => void} - Function to unlock the scrollbars.
 */
function lockScrollbars(node = null) {
  const mouseOver = () => {
    window.removeEventListener('wheel', preventDefault, { capture: true })
    window.removeEventListener('keydown', preventScrollKeys, { capture: true })
  }
  const mouseOut = () => {
    window.addEventListener('wheel', preventDefault, {
      capture: true,
      passive: false,
    })
    window.addEventListener('keydown', preventScrollKeys, {
      capture: true,
      passive: false,
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
  const scrollables = Array.from(
    (node || document).querySelectorAll('*')
  ).filter((node) => {
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
  let className

  const create = () => {
    if (node) {
      node.addEventListener('mouseover', mouseOver, { capture: true })
      node.addEventListener('mouseout', mouseOut, { capture: true })
      mouseOut()
    }
    window.addEventListener('mousedown', mouseDown, { capture: true })
    window.addEventListener('mouseup', mouseUp, { capture: true })
    window.addEventListener('wheel', wheelLock, {
      capture: true,
      passive: false,
    })
    window.addEventListener('keydown', preventScrollKeys, {
      capture: true,
      passive: false,
    })

    /**
     * Set touch action styles to prevent scrolling on mobile devices.
     * To fix Safari still scrolling the page on overflow elements, we apply
     * pan-x or pan-y to the element depending on the scrollable axis.
     */
    const shouldCreateStyle = style === undefined

    if (shouldCreateStyle) {
      style = document.createElement('style')
    }

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
      style.innerHTML = `*, ::backdrop { touch-action: none }\n.${className}, .${className} * { overscroll-behavior: contain; touch-action: ${touchAction} }`
    } else {
      style.innerHTML = `*, ::backdrop { touch-action: none }`
    }

    if (shouldCreateStyle) {
      document.head.appendChild(style)
    }
  }

  const destroy = () => {
    if (node) {
      node.removeEventListener('mouseover', mouseOver, { capture: true })
      node.removeEventListener('mouseout', mouseOut, { capture: true })
      mouseOver()
      node.classList.remove(className)
    }
    window.removeEventListener('mousedown', mouseDown, { capture: true })
    window.removeEventListener('mouseup', mouseUp, { capture: true })
    window.removeEventListener('wheel', wheelLock, { capture: true })
    window.removeEventListener('keydown', preventScrollKeys, { capture: true })

    scrollables.forEach((scrollableNode) => {
      scrollableNode.style.touchAction = ''
    })
  }

  if (lockedScrolls.length > 0) {
    // check if we need to remove any current scroll locks
    lockedScrolls[lockedScrolls.length - 1].destroy()

    // filter any nodes that may be gone from the DOM now
    lockedScrolls = lockedScrolls.filter((lockedScroll) =>
      document.body.contains(lockedScroll.node)
    )
  }

  // store the scroll lock create/destroy methods so we can disable them when
  // new ones are created or enable them when old ones are destroyed
  if (document.body.contains(node)) {
    lockedScrolls.push({ node, create, destroy })
    create()
  }

  return () => {
    const index = lockedScrolls.findIndex((scroll) => scroll.node === node)

    if (index > -1) {
      destroy()

      // remove this scroll lock from stored scroll locks
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

    if (lockedScrolls.length === 0) {
      style.remove()
      style = undefined
    }
  }
}

module.exports = { lockScrollbars }
