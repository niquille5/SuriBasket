const express = require("express");
const path = require("path");

function createPageRouter(pagesDir) {
  const router = express.Router();
  const pages = {
    "/": "login.html",
    "/index.html": "index.html",
    "/producten.html": "producten.html",
    "/scanner.html": "scanner.html",
    "/begroting.html": "begroting.html",
    "/feedback.html": "feedback.html",
    "/login.html": "login.html",
    "/admin.html": "admin.html"
  };

  Object.entries(pages).forEach(([route, file]) => {
    router.get(route, (req, res) => {
      res.sendFile(path.join(pagesDir, file));
    });
  });

  return router;
}

module.exports = createPageRouter;
