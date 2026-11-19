import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { userRepository } from "../repositories/user.repository";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

/**
 * Mock authentication: reviewers pick one of the seeded users and we store a signed,
 * HTTP-only session cookie. There are no passwords on purpose (see ARCHITECTURE.md);
 * swapping this for real auth only touches this service and the login page.
 */
export const SESSION_COOKIE = "ajaia_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(value);
}

export type SessionUser = { id: string; name: string; email: string; color: string };

export const sessionService = {
  /** Demo sign-in by email (ids change when the DB is re-seeded, emails don't). */
  async signIn(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new NotFoundError("Unknown demo user. Reload the page and try again.");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${MAX_AGE_SECONDS}s`)
      .sign(secret());
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
    return user;
  },

  async signOut() {
    (await cookies()).delete(SESSION_COOKIE);
  },

  /** Signed-in user or null. Cached per request. */
  currentUser: cache(async (): Promise<SessionUser | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secret());
      return payload.sub ? await userRepository.findById(payload.sub) : null;
    } catch {
      return null;
    }
  }),

  async requireUser(): Promise<SessionUser> {
    const user = await sessionService.currentUser();
    if (!user) throw new UnauthorizedError();
    return user;
  },

  listDemoUsers() {
    return userRepository.listAll();
  },
};
