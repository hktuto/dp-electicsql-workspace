// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@element-plus/nuxt', '@nuxthub/core', '@nuxt/icon'],

  hub:{
    blob: false,
    db: {
      dialect: 'postgresql',
      migrationsDirs: [
        'server/db/custom-migrations/'
      ],
      connection: {
        connectionString: process.env.DATABASE_URL
      }
    },
    dir: '.data'
  },
  css: ['@/assets/style/main.scss'],
  
  // Runtime config
  runtimeConfig: {
    // Private server-side config (not exposed to client)
    electricUrl: process.env.ELECTRIC_URL || 'http://localhost:30000',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://docpal:docpal_dev@localhost:5432/docpal',
    
    // Minio config (server-side only)
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: process.env.MINIO_PORT || '9000',
      useSSL: process.env.MINIO_USE_SSL || 'false',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'docpal',
    },
  },
  
  // Vite configuration for ElectricSQL/PGlite
  vite: {
    optimizeDeps: {
      // Exclude PGlite packages from optimization (they contain WASM files)
      exclude: [
        '@electric-sql/pglite',
        '@electric-sql/pglite-sync'
      ],

    }
  }
})