const env = require("../../config/env");

const ADMIN_ACCESS_COOKIE_NAME = "stoury_admin_access";

const getAdminCookieOptions = ({ envConfig = env } = {}) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: envConfig.NODE_ENV === "production",
  path: "/admin",
});

const parseCookieHeader = (value) =>
  String(value || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const cookieValue = decodeURIComponent(part.slice(separatorIndex + 1).trim());

      return {
        ...cookies,
        [key]: cookieValue,
      };
    }, {});

const getAdminAccessTokenFromRequest = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie);

  return cookies[ADMIN_ACCESS_COOKIE_NAME] || null;
};

const setAdminAuthCookie = (res, accessToken) =>
  res.cookie(ADMIN_ACCESS_COOKIE_NAME, accessToken, getAdminCookieOptions());

const clearAdminAuthCookie = (res) =>
  res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, getAdminCookieOptions());

const sanitizeAdminNextPath = (value, fallback = "/admin") => {
  const normalized = String(value || "").trim();

  if (!normalized || normalized === "/admin/login" || !normalized.startsWith("/admin")) {
    return fallback;
  }

  if (normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
};

const buildAdminLoginUrl = ({ nextPath = "/admin", reason = null } = {}) => {
  const params = new URLSearchParams();
  const safeNextPath = sanitizeAdminNextPath(nextPath);

  if (safeNextPath !== "/admin") {
    params.set("next", safeNextPath);
  }

  if (reason) {
    params.set("reason", reason);
  }

  const query = params.toString();

  return query ? `/admin/login?${query}` : "/admin/login";
};

const getLoginAlertFromReason = (reason) => {
  switch (reason) {
    case "auth_required":
      return {
        type: "warning",
        title: "Sign in required",
        message: "Please sign in with an admin account to access the dashboard.",
      };
    case "session_expired":
      return {
        type: "warning",
        title: "Session expired",
        message: "Your admin session has expired. Please sign in again.",
      };
    case "forbidden":
      return {
        type: "danger",
        title: "Admin access only",
        message: "This area is restricted to accounts with the admin role.",
      };
    case "logged_out":
      return {
        type: "success",
        title: "Signed out",
        message: "Your admin session has been cleared.",
      };
    case "rate_limited":
      return {
        type: "warning",
        title: "Too many attempts",
        message: "Too many admin sign-in attempts were made. Please wait and try again.",
      };
    default:
      return null;
  }
};

const getRuntimeStatusTone = (status) => {
  switch (status) {
    case "enabled":
      return "success";
    case "misconfigured":
      return "warning";
    case "disabled":
      return "neutral";
    default:
      return "info";
  }
};

module.exports = {
  ADMIN_ACCESS_COOKIE_NAME,
  buildAdminLoginUrl,
  clearAdminAuthCookie,
  getAdminAccessTokenFromRequest,
  getAdminCookieOptions,
  getLoginAlertFromReason,
  getRuntimeStatusTone,
  sanitizeAdminNextPath,
  setAdminAuthCookie,
};
