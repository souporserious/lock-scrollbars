const listenerOptions = { capture: true, passive: false }
const scrollCoords = new WeakMap()
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
    window.removeEventListener('wheel', preventDefault, listenerOptions)
    window.removeEventListener('keydown', preventScrollKeys, listenerOptions)
  }
  const mouseOut = () => {
    window.addEventListener('wheel', preventDefault, listenerOptions)
    window.addEventListener('keydown', preventScrollKeys, listenerOptions)
  }
  const mouseDown = (event) => {
    if (event.target !== node) {
      scrollCoords.set(event.target, {
        x: event.target.scrollLeft,
        y: event.target.scrollTop,
      })
    }
  }
  const wheelLock = (event) => {
    if (node !== event.target && node.contains(event.target)) {
      return
    }
    event.preventDefault()
  }
  const scrollLock = (event) => {
    let scrollElement = event.target

    if (event.target === document) {
      scrollElement = document.documentElement
    }

    const scrollElementCoords = scrollCoords.get(scrollElement)

    if (scrollElementCoords) {
      scrollElement.scrollLeft = scrollElementCoords.x
      scrollElement.scrollTop = scrollElementCoords.y
    }
  }
  let className

  const create = () => {
    if (node) {
      node.addEventListener('mouseover', mouseOver, true)
      node.addEventListener('mouseout', mouseOut, true)
      mouseOut()
    }
    window.addEventListener('mousedown', mouseDown, true)
    window.addEventListener('wheel', wheelLock, listenerOptions)
    window.addEventListener('scroll', scrollLock, true)
    window.addEventListener('keydown', preventScrollKeys, listenerOptions)

    /**
     * Set touch action styles to prevent scrolling on mobile devices.
     * To fix Safari still scrolling the page on overflow elements, we apply
     * pan-x or pan-y to the element depending on the scrollable axis.
     */
    const shouldCreateStyle = style === undefined

    if (shouldCreateStyle) {
      style = document.createElement('style')
    }

    if (node) {
      const canScrollX = node.scrollWidth > node.clientWidth
      const canScrollY = node.scrollHeight > node.clientHeight
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

      style.innerHTML = `*, ::backdrop { touch-action: none }\n.${className} { overscroll-behavior: contain; touch-action: ${touchAction} }\n.${className} * { touch-action: auto }`
    } else {
      style.innerHTML = `*, ::backdrop { touch-action: none }`
    }

    if (shouldCreateStyle) {
      document.head.appendChild(style)
    }
  }

  const destroy = () => {
    if (node) {
      node.removeEventListener('mouseover', mouseOver, true)
      node.removeEventListener('mouseout', mouseOut, true)
      mouseOver()
      node.classList.remove(className)
    }
    window.removeEventListener('mousedown', mouseDown, true)
    window.removeEventListener('wheel', wheelLock, listenerOptions)
    window.removeEventListener('scroll', scrollLock, true)
    window.removeEventListener('keydown', preventScrollKeys, listenerOptions)
  }

  if (lockedScrolls.length > 0) {
    // check if we need to remove any current scroll locks
    lockedScrolls[lockedScrolls.length - 1].destroy()

    // filter any nodes that may be gone from the DOM now
    lockedScrolls = lockedScrolls.filter((lockedScroll) =>
      document.body.contains(lockedScroll.node)
    )
  }

  // store the scroll lock enable/disable methods so we can disable them when
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
