export default function SettingsPage() {
  return (
    <main className="space-y-4 p-6">
      <h2 className="text-3xl font-semibold">Brand Voice Settings</h2>
      <p className="text-slate-300">Configure workspace/location voice: tone, do/don’t lists, examples, banned words, and sign-off.</p>
      <div className="rounded-lg border border-border bg-card p-4">
        <p>Use Prisma models <code>BrandVoice</code> scoped to workspace or location.</p>
      </div>
    </main>
  );
}
