import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { forward } from '@ngrok/ngrok'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadNgrokTokenFromEnvFiles() {
  if (process.env.NGROK_AUTHTOKEN) return
  for (const name of ['.env.local', '.env']) {
    const p = join(root, name)
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const m = trimmed.match(/^NGROK_AUTHTOKEN\s*=\s*(.*)$/)
      if (!m) continue
      let v = m[1].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (v) {
        process.env.NGROK_AUTHTOKEN = v
        return
      }
    }
  }
}

loadNgrokTokenFromEnvFiles()

const port = Number(process.env.NGROK_PORT ?? process.argv[2] ?? 5173)

if (!process.env.NGROK_AUTHTOKEN) {
  console.error(
    'Thiếu NGROK_AUTHTOKEN.\n' +
      '• Thêm vào file .env hoặc .env.local (đã gitignore):\n' +
      '  NGROK_AUTHTOKEN=token_của_bạn\n' +
      '• Hoặc trong PowerShell (cùng cửa sổ trước khi chạy npm):\n' +
      '  $env:NGROK_AUTHTOKEN="token_của_bạn"\n' +
      'Lấy token: https://dashboard.ngrok.com/get-started/your-authtoken',
  )
  process.exit(1)
}

const listener = await forward({
  addr: port,
  authtoken_from_env: true,
})

console.log(`Đang forward localhost:${port} → ${listener.url()}`)
console.log('Nhấn Ctrl+C để dừng.')

const shutdown = async () => {
  try {
    await listener.close()
  } catch {
    // ignore
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.stdin.resume()
