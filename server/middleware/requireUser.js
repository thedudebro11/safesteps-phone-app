// server/middleware/requireUser.js
const { supabaseAuth } = require("../lib/supabaseAdmin");

async function requireUser(req, res, next) {
  // Only allow auth bypass in non-production environments
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  const requireAuthEnv = String(process.env.REQUIRE_AUTH || "true").toLowerCase();
  const REQUIRE_AUTH = requireAuthEnv === "true";

  if (!REQUIRE_AUTH) {
    if (isProd) {
      return res.status(500).json({ error: "REQUIRE_AUTH=false is not allowed in production" });
    }

    const devUserId = String(req.headers["x-dev-userid"] || "").trim();
    if (!devUserId) {
      return res.status(401).json({ error: "Missing x-dev-userid header (dev auth bypass enabled)" });
    }

    req.userId = devUserId;
    return next();
  }

  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data?.user?.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.userId = data.user.id;
    return next();
  } catch (e) {
    // Fail closed
    console.error("requireUser auth error:", e);
    return res.status(401).json({ error: "Auth verification failed" });
  }
}

module.exports = { requireUser };