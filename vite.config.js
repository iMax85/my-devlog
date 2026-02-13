import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/my-devlog/', // <--- 請注意：前後都要有斜線，中間是您的倉庫名稱
})
