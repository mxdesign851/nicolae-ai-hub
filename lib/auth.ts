import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sanitizeEmail } from '@/lib/sanitize';

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in'
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'email', type: 'email' },
        password: { label: 'password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const normalizedEmail = sanitizeEmail(credentials.email);
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user?.hashedPassword) return null;
        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name || undefined };
      }
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })]
      : [])
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials' && user.email) {
        await prisma.user.upsert({
          where: { email: sanitizeEmail(user.email) },
          update: {
            name: user.name,
            image: user.image
          },
          create: {
            email: sanitizeEmail(user.email),
            name: user.name,
            image: user.image
          }
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }

      if (token.email) {
        const existing = await prisma.user.findUnique({ where: { email: token.email } });
        if (existing) token.sub = existing.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
};

export const handler = NextAuth(authOptions);
