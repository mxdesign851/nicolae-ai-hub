export default function SourcesPage() {
  return (
    <main className="space-y-4 p-6">
      <h2 className="text-3xl font-semibold">Sources & Imports</h2>
      <p className="text-slate-300">Supported sources: Google, Facebook, Yelp, Trustpilot, and custom manual imports.</p>
      <div className="rounded-lg border border-border bg-card p-4">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Add review manually via <code>POST /api/reviews/import</code>.</li>
          <li>Import CSV columns: name, rating, date, text, source, location, url.</li>
        </ol>
      </div>
    </main>
  );
}
