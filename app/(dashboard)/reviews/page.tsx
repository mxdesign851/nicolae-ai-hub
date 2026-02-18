import { prisma } from '@/lib/prisma';

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { location: true } });

  return (
    <main className="p-6">
      <h2 className="mb-4 text-3xl font-semibold">Reviews</h2>
      <div className="rounded-lg border border-border bg-card p-4">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-300">
            <tr>
              <th>Author</th><th>Rating</th><th>Location</th><th>Status</th><th>Sentiment</th><th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-t border-border">
                <td className="py-2">{review.authorName}</td>
                <td>{review.rating}</td>
                <td>{review.location.name}</td>
                <td>{review.status}</td>
                <td>{review.sentiment}</td>
                <td>{review.tags.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
