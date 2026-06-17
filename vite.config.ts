import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const githubProxy = {
  '/api/github': {
    target: 'https://api.github.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/github/, ''),
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'git-lifeline/1.0'
    }
  }
}

export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE_PATH || '/',
  server: { port: 3000, proxy: githubProxy },
  preview: { port: 3000, proxy: githubProxy }
})