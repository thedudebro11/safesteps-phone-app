// server/index.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Set REQUIRE_AUTH=true if you want to force auth even in dev.
const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH || "").toLowerCase() === "true";

function requireBearer(req, res, next) {
  if (!REQUIRE_AUTH) return next(); // dev default: allow

  const auth = req.headers.authorization || "";
  const ok = auth.startsWith("Bearer ") && auth.length > "Bearer ".length;
  if (!ok) return res.status(401).json({ error: "Missing Bearer token" });
  next();
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/locations", requireBearer, (req, res) => {
  // Minimal dev response
  return res.status(200).json({ ok: true });
});

app.post("/api/emergency", requireBearer, (req, res) => {
  return res.status(200).json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SafeSteps dev API listening on http://localhost:${PORT}`);
  console.log(`   REQUIRE_AUTH=${REQUIRE_AUTH ? "true" : "false"}`);
});
