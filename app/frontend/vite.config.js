import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { transform } from 'esbuild'
import { readFile } from 'node:fs/promises'

const cytoscapeReactEsbuildPlugin = {
  name: 'cytoscape-react-jsx',
  setup(build) {
    const filter = /node_modules[\\/](cytoscape-react)[\\/].*\.js$/
    build.onLoad({ filter }, async (args) => ({
      contents: await readFile(args.path, 'utf8'),
      loader: 'jsx',
    }))
  },
}

const cytoscapeReactTransformPlugin = () => ({
  name: 'cytoscape-react-jsx-transform',
  enforce: 'pre',
  async transform(code, id) {
    if (!id.includes('node_modules/cytoscape-react') || !id.endsWith('.js')) {
      return null
    }
    const result = await transform(code, {
      loader: 'jsx',
      jsx: 'automatic',
    })
    return { code: result.code, map: result.map }
  },
})

export default defineConfig({
  plugins: [react(), cytoscapeReactTransformPlugin()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [cytoscapeReactEsbuildPlugin],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

