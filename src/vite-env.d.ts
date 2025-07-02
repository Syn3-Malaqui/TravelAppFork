/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_ACCESS_KEY_ID: string
  readonly VITE_AWS_SECRET_ACCESS_KEY: string
  readonly VITE_AWS_REGION: string
  readonly VITE_S3_BUCKET: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 