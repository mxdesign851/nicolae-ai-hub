import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/marketing';
import { Logo } from '@/components/logo';

export default function BlogIndexPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/" className="btn btn-secondary">
            Back home
          </Link>
          <Link href="/sign-up" className="btn btn-primary">
            Start free
          </Link>
        </div>
      </header>

      <section className="mt-10">
        <h1 className="text-4xl font-semibold">ReplyZen Blog</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Tactical guides for AI review operations, brand voice systems, and subscription-ready SaaS workflows.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="badge">{post.category}</span>
              <span className="text-xs text-slate-500">{post.readTime}</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{post.excerpt}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">{post.publishedAt}</span>
              <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-blue-300">
                Read article {'->'}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
