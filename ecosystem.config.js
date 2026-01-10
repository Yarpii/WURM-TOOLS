module.exports = {
  apps: [
    {
      name: 'blackforge-web',
      script: 'npm',
      args: 'start',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'blackforge-bot',
      script: 'dist/index.js',
      cwd: './bot',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
    },
  ],
};
