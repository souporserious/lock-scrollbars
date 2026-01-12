// @ts-expect-error
import { RenounLogoLink } from 'renoun/assets'
import { CodeBlock, Link } from 'renoun/components'
import { Example } from './Example'

const exampleCode = `
'use client'
import React, { useEffect } from 'react'
import { lockScrollbars } from 'lock-scrollbars'

function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null)
  const unlockScrollbars = React.useRef<null | (() => void)>(null)

  useEffect(() => {
    const dialogNode = dialogRef.current
    if (dialogNode) {
      if (open) {
        dialogNode.showModal()
        unlockScrollbars.current = lockScrollbars()
      } else {
        dialogNode.close()
        unlockScrollbars.current?.()
      }
    }
  }, [open])

  return <dialog ref={dialogRef}>{children}</dialog>
}
`

export default function Page() {
  return (
    <>
      <main className="flex flex-col min-h-screen max-w-screen-xl p-8 mx-auto gap-8 bg-white dark:bg-gray-800">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white sm:text-5xl">
                lock-scrollbars
              </h2>
              <p className="max-w-[900px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                A small browser utility to lock all scrollbars recursively.
              </p>
            </div>
            <Link variant="repository" className="block w-6 h-6" />
          </div>
          <div className="md:col-span-2">
            <CodeBlock
              children={exampleCode}
              language="tsx"
              highlightedLines="3,7,14,17"
              focusedLines="3,7,14,17"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 py-6 gap-8 text-gray-900 dark:text-gray-200">
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Installation</h2>
            <CodeBlock children="npm install lock-scrollbars" language="bash" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Usage</h2>
            <p>
              Lock and unlock scrollbars programmatically using&nbsp;
              <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-sm dark:bg-white/10">
                lockScrollbars
              </code>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Example</h2>
            <div className="flex flex-col items-start lg:flex-row gap-4">
              <Example />
              <p>Open an example modal to lock the scrollbar.</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="flex items-center justify-center p-4 gap-2">
        <span className="text-gray-500 dark:text-gray-400">
          Site built with
        </span>
        <RenounLogoLink className="h-4" />
      </footer>
    </>
  )
}
