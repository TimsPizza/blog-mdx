import { createDrizzleFromEnv, type DrizzleDb } from "@/lib/db/d1";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import NextAuth, { type DefaultSession, type NextAuthOptions } from "next-auth";
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import { getServerSession } from "next-auth/next";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      login?: string | null;
    } & DefaultSession["user"];
  }
}

const allowedProfileId = process.env.GITHUB_PROFILE_ID;
const adminUserId = allowedProfileId ? String(allowedProfileId) : "";

const buildAdminUser = (): AdapterUser | null => {
  if (!adminUserId) return null;
  return {
    id: adminUserId,
    name: null,
    email: "",
    emailVerified: null,
    image: null,
  };
};

const toAdapterSession = (row: {
  session_token: string;
  user_id: string;
  expires: Date;
}): AdapterSession => ({
  sessionToken: row.session_token,
  userId: row.user_id,
  expires: row.expires,
});

const createSingleAdminAdapter = (db: DrizzleDb): Adapter => ({
  async createUser() {
    const user = buildAdminUser();
    if (!user) throw new Error("Missing admin user id.");
    return user;
  },
  async getUser(id: string) {
    const user = buildAdminUser();
    if (!user || id !== user.id) return null;
    return user;
  },
  async getUserByEmail() {
    return null;
  },
  async getUserByAccount(account) {
    const user = buildAdminUser();
    if (!user) return null;
    const providerId =
      typeof account.providerAccountId === "string"
        ? account.providerAccountId
        : "";
    return providerId === user.id ? user : null;
  },
  async updateUser(data) {
    const user = buildAdminUser();
    if (!user || data.id !== user.id) {
      throw new Error("Unknown admin user.");
    }
    return user;
  },
  async deleteUser() {},
  async createSession(data) {
    const expires =
      data.expires instanceof Date ? data.expires : new Date(Date.now());
    await db
      .insert(sessions)
      .values({
        session_token: data.sessionToken,
        user_id: data.userId,
        expires,
      })
      .run();
    return toAdapterSession({
      session_token: data.sessionToken,
      user_id: data.userId,
      expires,
    });
  },
  async getSessionAndUser(sessionToken) {
    const row = await db
      .select()
      .from(sessions)
      .where(eq(sessions.session_token, sessionToken))
      .get();
    if (!row) return null;
    const user = buildAdminUser();
    if (!user || row.user_id !== user.id) return null;
    return {
      session: toAdapterSession(row),
      user,
    };
  },
  async updateSession(data) {
    if (!data.sessionToken) return null;
    if (data.expires instanceof Date) {
      await db
        .update(sessions)
        .set({ expires: data.expires })
        .where(eq(sessions.session_token, data.sessionToken))
        .run();
    }
    const row = await db
      .select()
      .from(sessions)
      .where(eq(sessions.session_token, data.sessionToken))
      .get();
    return row ? toAdapterSession(row) : null;
  },
  async deleteSession(sessionToken) {
    await db
      .delete(sessions)
      .where(eq(sessions.session_token, sessionToken))
      .run();
  },
  async createVerificationToken(
    token: VerificationToken,
  ): Promise<VerificationToken> {
    return token;
  },
  async useVerificationToken(): Promise<VerificationToken | null> {
    return null;
  },
});

const adapter = (() => {
  const db = createDrizzleFromEnv();
  if (!db) return undefined;
  return createSingleAdminAdapter(db);
})();

export const authOptions: NextAuthOptions = {
  adapter,
  session: {
    strategy: adapter ? "database" : "jwt",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "",
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.login ?? profile.name ?? "",
          email: profile.email ?? null,
          image: profile.avatar_url ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!allowedProfileId) return false;
      const allowed = String(allowedProfileId);
      const accountId =
        typeof account?.providerAccountId === "string"
          ? account.providerAccountId
          : "";
      const profileIdValue = (profile as { id?: unknown } | null)?.id ?? null;
      const profileId =
        typeof profileIdValue === "number" || typeof profileIdValue === "string"
          ? String(profileIdValue)
          : "";
      const userId =
        typeof user?.id === "string"
          ? user.id
          : user?.id
            ? String(user.id)
            : "";
      return [accountId, profileId, userId].some(
        (candidate) => candidate === allowed,
      );
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.login = user.name ?? null;
      }
      return session;
    },
  },
};

export const auth = () => getServerSession(authOptions);

export const authHandler = NextAuth(authOptions);
