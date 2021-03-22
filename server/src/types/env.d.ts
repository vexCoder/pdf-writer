/* eslint-disable no-unused-vars */

declare namespace NodeJS {
  export interface ProcessEnv {
    API_VERSION: string;
    NODE_ENV: string;
    PORT: string;
    SESSION_SECRET: string;
    CORS_ORIGIN: string;
  }
}
