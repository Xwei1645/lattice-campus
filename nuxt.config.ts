import { execSync } from 'child_process';
import { version as vueVersion } from 'vue';
import pkg from './package.json';

const getGitHash = () => {
  if (process.env.GIT_HASH) {
    return process.env.GIT_HASH;
  }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return 'unknown';
  }
};

export default defineNuxtConfig({
  srcDir: 'app/',
  serverDir: 'app/server',
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // 仅在服务端可见
    backupInterval: 12 * 60 * 60 * 1000, // 默认 12 小时
    backupMaxKeep: 10, // 默认保留 10 个备份
    public: {
      buildInfo: {
        version: pkg.version || '1.0.0',
        gitHash: getGitHash(),
        buildTime: new Date().toISOString(),
        nuxtVersion: pkg.dependencies?.nuxt?.replace('^', '') || 'unknown',
        vueVersion: vueVersion || pkg.dependencies?.vue?.replace('^', '') || 'unknown',
      }
    }
  },
  app: {
    head: {
      title: 'WZHS Booking',
      titleTemplate: '%s | WZHS Booking'
    }
  },
  modules: [
    '@tdesign-vue-next/nuxt'
  ],
  tdesign: {
    resolveIcons: true,
    plugins: ['MessagePlugin', 'DialogPlugin']
  }
});