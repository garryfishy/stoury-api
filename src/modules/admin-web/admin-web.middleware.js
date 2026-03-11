const { verifyAccessToken } = require("../../utils/jwt");
const {
  buildAdminLoginUrl,
  clearAdminAuthCookie,
  getAdminAccessTokenFromRequest,
} = require("./admin-web.helpers");

const extractAdminSession = (req) => {
  const token = getAdminAccessTokenFromRequest(req);

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);

  if (payload.tokenType !== "access") {
    throw new Error("Invalid admin token type.");
  }

  const roles = Array.isArray(payload.roles) ? payload.roles : ["user"];

  if (!roles.includes("admin")) {
    throw new Error("Admin role required.");
  }

  return {
    userId: String(payload.sub),
    email: payload.email,
    roles,
  };
};

const redirectAuthenticatedAdmin = (req, res, next) => {
  try {
    const session = extractAdminSession(req);

    if (!session) {
      return next();
    }

    req.adminAuth = session;
    return res.redirect("/admin");
  } catch (_error) {
    clearAdminAuthCookie(res);
    return next();
  }
};

const requireAdminPageAuth = (req, res, next) => {
  try {
    const session = extractAdminSession(req);

    if (!session) {
      clearAdminAuthCookie(res);
      return res.redirect(
        buildAdminLoginUrl({
          nextPath: req.originalUrl,
          reason: "auth_required",
        })
      );
    }

    req.adminAuth = session;
    res.locals.adminUser = session;
    return next();
  } catch (error) {
    clearAdminAuthCookie(res);

    return res.redirect(
      buildAdminLoginUrl({
        nextPath: req.originalUrl,
        reason:
          error?.message === "Admin role required." ? "forbidden" : "session_expired",
      })
    );
  }
};

module.exports = {
  redirectAuthenticatedAdmin,
  requireAdminPageAuth,
};
