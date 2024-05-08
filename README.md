# lock-scrollbars

Lock all scrollbars to prevent scrolling the page. Useful for modals, popovers, and other UI elements that require user interaction before continuing.

> [!NOTE]
> Most libraries that lock scroll modify the body overflow style which can cause performance issues since [the entire page styles are recalculated](https://atfzl.com/articles/don-t-attach-tooltips-to-document-body/). This library instead uses the `scroll` event to prevent scrolling and keeping the window in the same position until it is unlocked.

## Installation

```bash
npm install lock-scrollbars
```

## Usage

```ts
import { lockScrollbars } from 'lock-scrollbars'

const unlockScrollbars = lockScrollbars()

// ...open a modal or popover

unlockScrollbars()
```

Optionally, provide an element to allow scrolling within that element:

```ts
import { lockScrollbars } from 'lock-scrollbars'

const element = document.getElementById('scrollable-element')
const unlockScrollbars = lockScrollbars(element)
```

### React

```tsx
import React, { useRef, useEffect, useState } from 'react'
import { lockScrollbars } from 'lock-scrollbars'

function Modal({
  open,
  children,
}: {
  open: boolean
  children: React.ReactNode
}) {
  const element = useRef<HTMLDivElement>(null)
  const unlockScrollbars = useRef<ReturnType<typeof lockScrollbars>>(null)

  useEffect(() => {
    if (open) {
      unlockScrollbars.current = lockScrollbars(element.current!)
    } else {
      unlockScrollbars.current?.()
    }
  }, [open])

  return <div ref={element}>{children}</div>
}
```
