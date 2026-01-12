import type { Config } from 'tailwindcss'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const config: Config = {
  content: [
    path.join(rootDir, 'pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(rootDir, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(rootDir, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {},
  plugins: [],
}
export default config
