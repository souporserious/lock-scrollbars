import { createMdxtsPlugin } from 'mdxts/next'

const withMdxtsPlugin = createMdxtsPlugin({
  theme: 'nord',
  gitSource: 'https://github.com/souporserious/lock-scrollbars',
  siteUrl: 'https://lock-scrollbars.vercel.app/',
})

export default withMdxtsPlugin({
  output: 'export',
})
