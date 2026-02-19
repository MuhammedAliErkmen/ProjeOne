// C:\Erkmen\ProjeOne\server.js
require("dotenv").config();

const { createApp } = require("./src/app");

const PORT = Number(process.env.PORT || 3000);

const app = createApp();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});
