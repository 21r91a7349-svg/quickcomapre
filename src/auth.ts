import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/scraper/core/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  events: {
    // Migrate anonymous Price Alerts to the authenticated user on sign in
    async signIn({ user }) {
      if (user.email && user.id) {
        try {
          await prisma.priceAlert.updateMany({
            where: { 
              contactAddress: user.email,
              userId: null 
            },
            data: { 
              userId: user.id 
            }
          });
        } catch (error) {
          console.error("Failed to migrate anonymous alerts to user:", error);
        }
      }
    }
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Include role if available
        // @ts-ignore - typing fix for user role mapping
        session.user.role = user.role || 'USER'; 
      }
      return session;
    }
  }
});
