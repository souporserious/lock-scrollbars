import { createMdxtsPlugin } from 'mdxts/next'

const withMdxtsPlugin = createMdxtsPlugin({
  theme: 'nord',
})

export default withMdxtsPlugin({
  output: 'export',
})
