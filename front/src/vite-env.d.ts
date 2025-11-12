/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRICT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
