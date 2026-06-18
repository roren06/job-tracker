"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCrossSiteAuth = isCrossSiteAuth;
exports.authCookieOptions = authCookieOptions;
/** Use cross-site secure cookies only when the client is served over HTTPS. */
function isCrossSiteAuth() {
    const clientUrl = process.env.CLIENT_URL || "";
    return clientUrl.startsWith("https://");
}
function authCookieOptions() {
    const crossSite = isCrossSiteAuth();
    return {
        httpOnly: true,
        sameSite: crossSite ? "none" : "lax",
        secure: crossSite,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}
//# sourceMappingURL=cookieOptions.js.map