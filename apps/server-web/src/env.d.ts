/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_WEB_API_MODE?: 'mock' | 'real'
  readonly VITE_SERVER_WEB_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
