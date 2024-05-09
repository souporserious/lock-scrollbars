const listenerOptions = { capture: true, passive: false }
let lockedScrolls = []
let scrollbarWidth

if (typeof window !== 'undefined' && scrollbarWidth === undefined) {
  const div = document.createElement('div')
  div.setAttribute(
    'style',
    `
    width: 100px;
    height: 100px;
    position: absolute;
    pointer-events: none;
    overflow: scroll;
  `
  )
  document.body.appendChild(div)
  scrollbarWidth = div.offsetWidth - div.clientWidth
  document.body.removeChild(div)
}

/**
 * Lock all scrollbars by disabling mousewheel and locking scrollbars in position.
 * Optionally provide an element to allow it to scroll when hovered.
 * @param {HTMLElement|null} node - The DOM element to allow scrolling on hover.
 * @returns {() => void} - Function to unlock the scrollbars.
 */
function lockScrollbars(node = null) {
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
    if (node === null) {
      return
    }
    const scrollableDistance = node.scrollHeight - node.offsetHeight
    if (
      (event.deltaY > 0 && node.scrollTop >= scrollableDistance) ||
      (event.deltaY < 0 && node.scrollTop <= 0)
    ) {
      event.preventDefault()
    }
  }
  const scrollLock = (event) => {
    const scrollElement =
      event.target === document ? document.documentElement : event.target
    const scrollElementCoords = scrollCoords.get(scrollElement)
    if (scrollElementCoords) {
      scrollElement.scrollLeft = scrollElementCoords.x
      scrollElement.scrollTop = scrollElementCoords.y
    }
  }
  const addListeners = () => {
    if (node) {
      node.addEventListener('mouseover', mouseOver, true)
      node.addEventListener('mouseout', mouseOut, true)
      mouseOut()
    }
    window.addEventListener('mousedown', mouseDown, true)
    window.addEventListener('wheel', wheelLock, listenerOptions)
    window.addEventListener('scroll', scrollLock, true)
    window.addEventListener('keydown', preventScrollKeys, listenerOptions)
  }
  const removeListeners = () => {
    if (node) {
      node.removeEventListener('mouseover', mouseOver, true)
      node.removeEventListener('mouseout', mouseOut, true)
      mouseOver()
    }
    window.removeEventListener('mousedown', mouseDown, true)
    window.removeEventListener('wheel', wheelLock, listenerOptions)
    window.removeEventListener('scroll', scrollLock, true)
    window.removeEventListener('keydown', preventScrollKeys, listenerOptions)
  }

  let scrollY = window.scrollY

  if (scrollbarWidth > 0 && document.body.scrollHeight > window.innerHeight) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  if (lockedScrolls.length === 0) {
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
  }

  if (lockedScrolls.length > 0) {
    // check if we need to remove any current scroll locks
    lockedScrolls[lockedScrolls.length - 1].removeListeners()

    // filter any nodes that may be gone from the DOM now
    lockedScrolls = lockedScrolls.filter((lockedScroll) =>
      document.body.contains(lockedScroll.node)
    )
  }

  // store the scroll lock enable/disable methods so we can disable them when
  // new ones are created or enable them when old ones are destroyed
  if (document.body.contains(node)) {
    lockedScrolls.push({
      node,
      addListeners,
      removeListeners,
    })
    addListeners()
  }

  return () => {
    const index = lockedScrolls.findIndex((scroll) => scroll.node === node)

    if (index > -1) {
      removeListeners()

      // remove this scroll lock from stored scroll locks
      lockedScrolls.splice(index, 1)

      // again, filter any nodes that may be gone from the DOM now
      lockedScrolls = lockedScrolls.filter((lockedScroll) => {
        const containsLockedScrollNode = document.body.contains(
          lockedScroll.node
        )
        // as a side effect, make sure to remove listeners from this node
        if (containsLockedScrollNode === false) {
          lockedScroll.removeListeners()
        }
        return containsLockedScrollNode
      })

      // enable the previous scroll lock if any are left
      if (lockedScrolls.length > 0) {
        lockedScrolls[lockedScrolls.length - 1].addListeners()
      }
    }

    if (lockedScrolls.length === 0) {
      if (
        scrollbarWidth > 0 &&
        document.body.scrollHeight > window.innerHeight
      ) {
        document.body.style.paddingRight = ''
      }
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      window.scrollTo(0, scrollY)
    }
  }
}

module.exports = { lockScrollbars }
