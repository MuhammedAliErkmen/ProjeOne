// C:\Erkmen\ProjeOne\src\routes\index.js
const express = require("express");

const { usersRouter } = require("./users.routes");
const { projectsRouter } = require("./projects.routes");
const { uploadRouter } = require("./upload.routes");

const apiRouter = express.Router();

apiRouter.use(usersRouter);
apiRouter.use(projectsRouter);
apiRouter.use(uploadRouter);

module.exports = { apiRouter };
