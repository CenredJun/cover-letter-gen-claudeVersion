import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds one self-contained HTML file for publishing as a claude.ai artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
