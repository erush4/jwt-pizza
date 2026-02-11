/// <reference types="vite/client" />


interface ImportMetaEnv {
  readonly VITE_PIZZA_FACTORY_URL: string;
  // Add other env variables as needed
  // readonly VITE_API_KEY: string;
  // readonly VITE_OTHER_VAR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}