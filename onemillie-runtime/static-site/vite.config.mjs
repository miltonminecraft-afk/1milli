import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  root:fileURLToPath(new URL('.',import.meta.url)),
  base:'/1milli/',
  publicDir:false,
  cacheDir:'H:/CodexData/Caches/onemillie/static-vite',
  plugins:[react()],
  build:{outDir:process.env.ONEMILLIE_SITE_OUTPUT||'H:/CodexData/Builds/onemillie/website',emptyOutDir:true,sourcemap:false},
});
