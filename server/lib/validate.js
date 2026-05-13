// server/lib/validate.js — Zod request body validation middleware
const { z } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

// ── Shared schemas ──────────────────────────────────────────────────────────

const latLng = z.object({
  lat: z.number({ required_error: "lat is required" }),
  lng: z.number({ required_error: "lng is required" }),
  accuracyM: z.number().optional(),
});

const trustRequest = z.object({
  targetUserId: z.string().min(1, "targetUserId is required"),
});

const visibilitySet = z.object({
  viewerUserId: z.string().min(1, "viewerUserId is required"),
  canView: z.boolean({ required_error: "canView must be a boolean" }),
});

const userLookup = z.object({
  email: z.string().email("email must be a valid email address"),
});

const pushRegister = z.object({
  expoToken: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("ExponentPushToken["), {
      message: "expoToken must start with ExponentPushToken[",
    }),
  platform: z.enum(["ios", "android"], {
    errorMap: () => ({ message: "platform must be ios or android" }),
  }),
});

const sharesStart = z.object({
  reason: z.enum(["manual", "emergency"]).default("manual"),
  contactUserId: z.string().uuid().optional(),
});

const sharesEnd = z.object({
  sessionId: z.string().uuid("sessionId must be a UUID"),
});

const profileUpdate = z.object({
  displayName: z
    .string()
    .min(1, "displayName must not be empty")
    .max(80, "displayName max 80 characters")
    .trim(),
});

module.exports = {
  validate,
  schemas: {
    latLng,
    trustRequest,
    visibilitySet,
    userLookup,
    pushRegister,
    sharesStart,
    sharesEnd,
    profileUpdate,
  },
};
