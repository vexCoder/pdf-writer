declare module 'vite/client' {
  export interface ImportMeta {
    wtf: string;
  }
  export interface ImportMetaEnv {
    VITE_APP_API: string;
  }
}
