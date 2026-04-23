import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { validateEmail, validatePasswordLength } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import { isAdminEmail } from "@utils/auth/isAdmin";

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
  const user = await User.findOne({ email }); // Include fields you need explicitly;

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
  else { return null; }
};

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {},

      async authorize(credentials) {
        const { email, password } = credentials;
        let validationError = await validateForm({ email, password });

        if (Object.keys(validationError).length !== 0) return null;

        try {
          let userData = await checkLogin(email, password);
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
        token.role = user.role || (isAdminEmail(user.email) ? "admin" : "user");
      } else if (account?.provider === "google") {
        // For Google, the user is created in signIn() callback above.
        // Look up the DB record by email to get the MongoDB _id + role.
        try {
          await connectMongoDB();
          const dbUser = await User.findOne({ email: user.email })
            .select("_id role")
            .lean();
          if (dbUser) {
            token.mongoId = dbUser._id.toString();
            token.role =
              dbUser.role || (isAdminEmail(user.email) ? "admin" : "user");
          }
        } catch {
          // Non-fatal — session.user.id will just be undefined; fallback by email will be used
        }
      }

      // Ensure a sensible default even if the lookup branches above miss.
      if (!token.role) {
        token.role = isAdminEmail(token.email || user?.email) ? "admin" : "user";
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.mongoId) {
        session.user.id = token.mongoId;
      }
      if (token?.role) {
        session.user.role = token.role;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account.provider === "google") {
        const { name, email } = user;
        try {
          await connectMongoDB();
          const userExists = await User.findOne({ email })
            .select("_id")
            .lean();

          if (!userExists) {
            // Create the user directly instead of round-tripping through
            // /api/user — saves one HTTP hop + cold start during sign-in.
            await User.create({
              name,
              email,
              password: "",
              emailVerified: true,
              authMethod: "google",
              role: isAdminEmail(email) ? "admin" : "user",
            });
          }
          return user;
        } catch (error) {
          console.error("Google signIn user upsert failed:", error?.message);
          return null;
        }
      } else if (account.provider === "credentials") {
        if (user.emailVerified === true) {
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
