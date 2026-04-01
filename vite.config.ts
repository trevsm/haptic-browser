import { defineConfig } from 'vite'

/**
 * GitHub Pages: https://trevsm.github.io/Haptic-Browser-Model/ → base `/Haptic-Browser-Model/`
 * CI sets `GITHUB_REPOSITORY`. Local dev uses `/` so `npm run dev` matches the dev server root.
 */
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repoName ? `/${repoName}/` : '/'

export default defineConfig({
  base,
  server: {
    port: 5173,
  },
})
