// Konfigurasi PM2 untuk menjalankan aplikasi di VPS.
// Pakai: pm2 start ecosystem.config.cjs  → lalu pm2 save
module.exports = {
  apps: [
    {
      name: "crm",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
