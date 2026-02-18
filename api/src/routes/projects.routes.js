// C:\Erkmen\ProjeOne\src\routes\projects.routes.js
const express = require("express");
const ProjectsService = require("../services/projects.service");
const { bad } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const projectsRouter = express.Router();
projectsRouter.use(requireAuth);

function getActorUsername(req) {
  // requireAuth sende nasıl setliyorsa ona göre genişlet
  return (
    req?.user?.username ||
    req?.user?.name ||
    req?.auth?.username ||
    req?.username ||
    "Anonim"
  );
}

// PROJECTS - LIST
projectsRouter.get("/projects", async (req, res) => {
  try {
    const list = await ProjectsService.listProjects();
    res.json(list);
  } catch (e) {
    console.error(e);
    bad(res, "Projects okunamadi: " + e.message, 500);
  }
});

// PROJECTS - CREATE
projectsRouter.post("/projects", async (req, res) => {
  try {
    const out = await ProjectsService.createProject(req.body || {}, getActorUsername(req));
    res.json(out);
  } catch (e) {
    console.error(e);
    bad(res, "Project eklenemedi: " + e.message, 500);
  }
});

// PROJECTS - UPDATE  ✅ actor eklendi
projectsRouter.put("/projects/:id", async (req, res) => {
  try {
    const actor = getActorUsername(req);
    const out = await ProjectsService.updateProject(req.params.id, req.body || {}, actor);
    res.json(out);
  } catch (e) {
    console.error(e);
    bad(res, "Project guncellenemedi: " + e.message, 500);
  }
});

// PROJECTS - DELETE (REST)
projectsRouter.delete("/projects/:id", async (req, res) => {
  try {
    const out = await ProjectsService.deleteProject(req.params.id);
    res.json(out);
  } catch (e) {
    console.error(e);
    bad(res, "Project silinemedi: " + e.message, 500);
  }
});

// PROJECTS - DELETE (eski query-string uyumu)
projectsRouter.delete("/projects", async (req, res) => {
  try {
    const id = req.query?.id;
    if (!id) return bad(res, "id gerekli");
    const out = await ProjectsService.deleteProject(id);
    res.json(out);
  } catch (e) {
    console.error(e);
    bad(res, "Project silinemedi: " + e.message, 500);
  }
});

module.exports = { projectsRouter };
