const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Also serve the api/frontend directory to make assets accessible
app.use("/api/frontend", express.static(path.join(__dirname, "api/frontend")));

// Catch all routes and serve index.html for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving assets from:`);
  console.log(`  - ${path.join(__dirname, "public")}`);
  console.log(`  - ${path.join(__dirname, "api/frontend")}`);
});
