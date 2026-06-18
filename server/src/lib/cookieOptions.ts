import type { CookieOptions } from "express";

/** Use cross-site secure cookies only when the client is served over HTTPS. */
export function isCrossSiteAuth(): boolean {
  const clientUrl = process.env.CLIENT_URL || "";
  return clientUrl.startsWith("https://");
}

export function authCookieOptions(): CookieOptions {
  const crossSite = isCrossSiteAuth();

  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
