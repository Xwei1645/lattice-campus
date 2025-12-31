export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@tdesign-vue-next/nuxt'
  ],
  vite: {
    optimizeDeps: {
      include: [
        'tdesign-vue-next',
        'tdesign-vue-next/es/button/index',
        'tdesign-vue-next/es/card/index',
        'tdesign-vue-next/es/menu/index',
        'tdesign-vue-next/es/layout/index',
        'tdesign-vue-next/es/table/index',
        'tdesign-vue-next/es/form/index',
        'tdesign-vue-next/es/input/index',
        'tdesign-vue-next/es/select/index',
        'tdesign-vue-next/es/dialog/index',
        'tdesign-vue-next/es/tag/index',
        'tdesign-vue-next/es/link/index',
        'tdesign-vue-next/es/switch/index',
        'tdesign-vue-next/es/input-adornment/index',
        'tdesign-vue-next/es/date-picker/index',
        'tdesign-vue-next/es/time-picker/index',
        'tdesign-vue-next/es/textarea/index',
        'tdesign-vue-next/es/popconfirm/index',
        'tdesign-vue-next/es/loading/index',
        'tdesign-vue-next/es/descriptions/index',
        'tdesign-icons-vue-next',
      ]
    }
  }
});