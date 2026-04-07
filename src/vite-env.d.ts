/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_ENV: string
  /** `true` — đăng nhập & danh sách nhân viên dùng dữ liệu giả (không cần backend). */
  readonly VITE_USE_MOCK_API?: string
  /** Client ID OAuth 2.0 (Web) từ Google Cloud Console — cùng giá trị với GOOGLE_CLIENT_ID trên BE. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
