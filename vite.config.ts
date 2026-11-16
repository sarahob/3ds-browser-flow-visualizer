import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Absolute asset URLs, so deep links like /spec-check/ load. For a subfolder: vite build --base=/sub/
  base: '/',
})
