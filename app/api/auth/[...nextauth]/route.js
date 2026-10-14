import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { validateEmail, validatePasswordLength } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import { isAdminEmail } from "@utils/auth/isAdmin";
import { ensureSavedListExists } from "@lib/savedList";
import { checkActionRateLimit, clearActionRateLimit } from "@lib/rateLimit";
import { cookies } from "next/headers";
import { claimGuestVotes } from "@lib/guestClaim";
import { GUEST_COOKIE_NAME } from "@/middleware";

const validateForm = async (data) => {
  let err = {};
  // Validate email address
  let ve = validateEmail(data.email);
  let vp = validatePasswordLength(data.password);

  if (ve.length !== 0) err.email = ve;
  if (vp.length !== 0) err.password = vp;

  return err;
};

const checkLogin = async (email, password) => {
  await connectMongoDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return null;
  }

  if (user.emailVerified) {
    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return null;
    }

    return user;
  }

  return null;
};

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },

      async authorize(credentials) {
        const { email, password } = credentials;
        let validationError = await validateForm({ email, password });

        if (Object.keys(validationError).length !== 0) return null;

        // Account lockout: block after ~5 user login attempts. The limit is set
        // to 10 internally because NextAuth v4 may invoke authorize() twice per
        // form submission, so 10 callback invocations maps to roughly 5 UX attempts.
        const lockoutKey = `login:${email.toLowerCase().trim()}`;
        const lockout = await checkActionRateLimit(lockoutKey, 10, 15 * 60 * 1000);
        if (lockout.limited) {
          throw new Error(
            `Too many failed login attempts. Please try again in ${lockout.retryAfter} seconds.`
          );
        }

        try {
          let userData = await checkLogin(email, password);
          if (userData) {
            // Successful login clears the failed-attempt counter.
            clearActionRateLimit(lockoutKey);
          }
          return userData;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Explicit TTLs so tokens aren't carried forever. 30-day absolute
    // lifetime with a 24h refresh window matches NextAuth defaults but
    // pins them so later upstream changes don't silently shift behaviour.
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Only runs on initial sign-in (when `user` is present)
      if (!user) return token;

      if (account?.provider === "credentials") {
        // credentials authorize() returns the full Mongoose document
        token.mongoId = user._id?.toString?.();
        token.username = user.username;
        token.role = user.role || (isAdminEmail(user.email) ? "admin" : "user");
      } else if (account?.provider === "google") {
        // signIn() already looked up/created the DB record and attached
        // mongoId + role to the user object, so prefer that. Fallback to
        // a case-insensitive lookup only if something went wrong.
        token.mongoId = user.mongoId || token.mongoId;
        token.username = user.username || token.username;
        token.role = user.role || token.role;
        token.isPro = user.isPro || token.isPro || false;

        if (!token.mongoId) {
          try {
            await connectMongoDB();
            const dbUser = await User.findOne({ email: user.email?.toLowerCase()?.trim() })
              .select("_id role username isPro")
              .lean();
            if (dbUser) {
              token.mongoId = dbUser._id.toString();
              token.username = dbUser.username;
              token.role =
                dbUser.role || (isAdminEmail(user.email) ? "admin" : "user");
              token.isPro = Boolean(dbUser.isPro || dbUser.role === "admin");
            }
          } catch {
            // Non-fatal — session.user.id will just be undefined; fallback by email will be used
          }
        }
      }

      // Ensure a sensible default even if the lookup branches above miss.
      if (!token.role) {
        token.role = isAdminEmail(token.email || user?.email) ? "admin" : "user";
      }
      if (token.role === "admin") {
        token.isPro = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.mongoId) {
        session.user.id = token.mongoId;
      }
      if (token?.username) {
        session.user.username = token.username;
      }
      if (token?.role) {
        session.user.role = token.role;
      }
      session.user.isPro = Boolean(token?.isPro || token?.role === "admin");
      return session;
    },
    async signIn({ user, account }) {
      if (account.provider === "google") {
        const { name, email } = user;
        const normalizedEmail = email?.toLowerCase()?.trim();
        if (!normalizedEmail) return false;

        try {
          await connectMongoDB();

          // Case-insensitive lookup so a credentials signup like
          // "User@Gmail.com" matches Google's "user@gmail.com".
          let existingUser = await User.findOne({ email: normalizedEmail }).lean();

          if (!existingUser) {
            // Create the user directly instead of round-tripping through
            // /api/user — saves one HTTP hop + cold start during sign-in.
            existingUser = await User.create({
              name,
              email: normalizedEmail,
              password: "",
              emailVerified: new Date(),
              authMethod: "google",
              role: isAdminEmail(normalizedEmail) ? "admin" : "user",
            });

            // Create default "Saved" list for the new user
            await ensureSavedListExists(existingUser._id);
          }

          // Enrich the in-memory user object so the JWT callback can pick up
          // the MongoDB _id + role without a second DB round-trip.
          user.id = existingUser._id.toString();
          user.mongoId = existingUser._id.toString();
          user.username = existingUser.username;
          user.role = existingUser.role || (isAdminEmail(normalizedEmail) ? "admin" : "user");
          user.isPro = Boolean(existingUser.isPro || user.role === "admin");
          user.email = normalizedEmail;

          // Asynchronously claim any anonymous votes cast prior to login
          try {
            const guestId = cookies().get(GUEST_COOKIE_NAME)?.value;
            if (guestId) {
              claimGuestVotes(guestId, user.id);
            }
          } catch {}

          return true;
        } catch (error) {
          console.error("Google signIn user upsert failed:", error?.message);
          return false;
        }
      } else if (account.provider === "credentials") {
        if (user.emailVerified) {
          // Asynchronously claim any anonymous votes cast prior to credentials login
          try {
            const guestId = cookies().get(GUEST_COOKIE_NAME)?.value;
            const targetUserId = user._id?.toString?.() || user.id;
            if (guestId && targetUserId) {
              claimGuestVotes(guestId, targetUserId);
            }
          } catch {}

          return user;
        } else {
          return null;
        }
      }

      return user;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
