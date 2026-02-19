module.exports = {
  apps: [
    {
      name: "dashboardba-api",
      cwd: "/var/www/dashboardba/api",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    }
  ]
};
