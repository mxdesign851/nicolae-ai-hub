import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sanitizeEmail } from '@/lib/sanitize';
import { ensureNextAuthPublicUrl } from '@/lib/public-url';

const fallbackSecret = 'replyzen-temporary-secret-change-me';
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('[auth] NEXTAUTH_SECRET is missing. Using temporary fallback secret.');
}

const normalizedAuthUrl = ensureNextAuthPublicUrl();
if (!normalizedAuthUrl && process.env.NODE_ENV === 'production') {
  console.warn('[auth] Unable to infer a public auth URL. Set APP_URL or NEXTAUTH_URL.');
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || fallbackSecret,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in'
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
        try {
          const normalizedEmail = sanitizeEmail(credentials.email);
          const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
          if (!user?.hashedPassword) return null;
          const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
          if (!isValid) return null;
          return { id: user.id, email: user.email, name: user.name || undefined };
        } catch (error) {
          console.error('[auth] Credentials authorize failed', error);
          return null;
        }
      }
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })]
      : [])
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials' && user.email) {
        try {
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
        } catch (error) {
          console.error('[auth] OAuth sign-in user sync failed', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }

      if (typeof token.email === 'string' && token.email.length > 0) {
        try {
          const existing = await prisma.user.findUnique({ where: { email: token.email } });
          if (existing) token.sub = existing.id;
        } catch (error) {
          console.error('[auth] JWT enrichment failed', error);
        }
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
