// server/middleware/requireUser.js
const { supabaseAuth } = require("../lib/supabaseAdmin");

async function requireUser(req, res, next) {
  // Optional dev bypass (you currently log REQUIRE_AUTH=false)
  const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH || "true").toLowerCase() === "true";
  if (!REQUIRE_AUTH) {
    req.userId = req.headers["x-dev-userid"] || "dev-user";
    return next();
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data?.user?.id) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.userId = data.user.id;
  next();
}

module.exports = { requireUser };
