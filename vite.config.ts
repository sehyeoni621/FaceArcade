import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run dev:mobile` serves over HTTPS on the LAN. getUserMedia only runs
  // in a secure context, and a phone hitting http://<lan-ip>:5173 is not one -
  // localhost is exempt, other hosts are not.
  const mobile = mode === 'mobile'

  return {
    plugins: [react(), ...(mobile ? [basicSsl()] : [])],
    server: mobile ? { host: true } : undefined,
  }
})
