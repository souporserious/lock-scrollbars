# lock-scrollbars

Lock all scrollbars recursively to prevent scrolling the page. Useful for
modals, popovers, and other UI elements that require user interaction before
continuing.

## Features

- Locks all scrollbars on the page
- Allows a specific scrollable element
- Supports nested scroll locks (e.g. popover within a modal)

[View Example](https://lock-scrollbars.vercel.app/)

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

### React Example

```tsx
import React, { useRef, useEffect } from 'react'
import { lockScrollbars } from 'lock-scrollbars'

function Modal({
  open,
  children,
}: {
  open: boolean
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const unlockScrollbars = useRef<ReturnType<typeof lockScrollbars> | null>(
    null
  )

  useEffect(() => {
    const dialogNode = dialogRef.current
    if (dialogNode) {
      if (open) {
        dialogNode.showModal()
        unlockScrollbars.current = lockScrollbars(dialogNode)
      } else {
        dialogNode.close()
        unlockScrollbars.current?.()
      }
    }
  }, [open])

  return <dialog ref={dialogRef}>{children}</dialog>
}
```

## Development

```bash
cd example
npm install
npm run dev
```
