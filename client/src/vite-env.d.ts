/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OVERSHOOT_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
