const plans = [
  { name: 'Free', features: '1 workspace, 1 location, 50 AI generations/month' },
  { name: 'Pro', features: '3 locations, 1,000 generations, brand voice + approval workflow' },
  { name: 'Agency', features: 'Unlimited locations, 10,000 generations, bulk + exports + priority' }
];

export default function BillingPage() {
  return (
    <main className="space-y-4 p-6">
      <h2 className="text-3xl font-semibold">Plans & Subscriptions</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="mt-2 text-sm text-slate-300">{plan.features}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-400">Stripe: /api/subscriptions/stripe • PayPal: /api/subscriptions/paypal</p>
    </main>
  );
}
