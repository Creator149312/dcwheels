import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { validateEmail, validatePasswordLength } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";

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
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        const { name, email } = user;
        try {
          await connectMongoDB();
          const userExists = await User.findOne({ email });

          if (!userExists) {
            const res = await fetch(`${apiConfig.apiUrl}/user`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name,
                email,
                password: '',
                emailVerified: true,
                authMethod: 'google', 
              }),
            });

            if (res.ok) {
              return user;
            }
          }
        } catch (error) {
          return null;
        }
      }else if(account.provider === "credentials"){
        if(user.emailVerified === true){
          return user;
        }else{
          return null;
        }
      }

      return user;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
