import React from 'react'
import { lockScrollbars } from '../../index'

/**
 * Displays content in a foreground window that temporarily disables interaction with the underlying page.
 * Learn how to build this at: https://souporserious.com/build-a-dialog-component-in-react/
 */
export function Modal({
  closeOnOutsideClick = true,
  onRequestClose,
  open,
  children,
}: {
  closeOnOutsideClick?: boolean
  onRequestClose: () => void
  open: boolean
  children: React.ReactNode
}) {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null)
  const lastActiveElement = React.useRef<HTMLElement | null>(null)
  const unlockScrollbars = React.useRef<ReturnType<
    typeof lockScrollbars
  > | null>(null)

  React.useEffect(() => {
    const dialogNode = dialogRef.current
    if (dialogNode) {
      if (open) {
        if (document.activeElement instanceof HTMLElement) {
          lastActiveElement.current = document.activeElement
        }
        dialogNode?.showModal()
        unlockScrollbars.current = lockScrollbars(dialogNode)
      } else {
        dialogNode?.close()
        unlockScrollbars.current?.()
        lastActiveElement.current?.focus()
      }
    }
  }, [open])

  React.useEffect(() => {
    const dialogNode = dialogRef.current
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onRequestClose()
    }
    dialogNode?.addEventListener('cancel', handleCancel)
    return () => {
      dialogNode?.removeEventListener('cancel', handleCancel)
    }
  }, [onRequestClose])

  function handleOutsideClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialogNode = dialogRef.current
    if (closeOnOutsideClick && event.target === dialogNode) {
      onRequestClose()
    }
  }

  return (
    <dialog ref={dialogRef} style={{ padding: 0 }} onClick={handleOutsideClick}>
      {children}
    </dialog>
  )
}
