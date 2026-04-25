// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devServer: {
    port: 3010
  },

  compatibilityDate: '2025-07-15',

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@nuxtjs/google-fonts',
    '@vueuse/nuxt',
    '@nuxtjs/mdc'
  ],

  googleFonts: {
    families: {
      'DM Sans': [400, 500, 600],
      'JetBrains Mono': [400]
    },
    display: 'swap'
  },

  runtimeConfig: {
    sessionSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:5001'
    }
  },

  imports: {
    dirs: ['stores']
  },

  css: ['assets/css/main.css']
})
