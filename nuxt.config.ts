import { execSync } from 'child_process';
import { version as vueVersion } from 'vue';
import pkg from './package.json';

const getGitHash = () => {
  if (process.env.GIT_HASH) {
    return process.env.GIT_HASH;
  }
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
  } catch (e) {
    return 'unknown';
  }
};

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
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
      titleTemplate: '%s | WZHS Booking',
      // 添加安全响应头（通过meta标签）
      meta: [
        // 防止MIME类型嗅探
        { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
        // XSS保护
        { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
        // 防止点击劫持
        { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
        // 引用策略
        { name: 'referrer', content: 'strict-origin-when-cross-origin' },
        // 禁用DNS预解析（根据需要调整）
        // { name: 'x-dns-prefetch-control', content: 'off' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ]
    }
  },
  modules: [
    '@tdesign-vue-next/nuxt'
  ],
  tdesign: {
    resolveIcons: true,
    plugins: ['MessagePlugin', 'DialogPlugin']
  },
  // Nitro 配置 - 添加安全响应头
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          // 防止MIME类型嗅探
          'X-Content-Type-Options': 'nosniff',
          // XSS保护
          'X-XSS-Protection': '1; mode=block',
          // 防止点击劫持
          'X-Frame-Options': 'DENY',
          // 引用策略
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          // 权限策略
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          // 内容安全策略（根据实际需求调整）
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join('; ')
        }
      }
    }
  }
});
