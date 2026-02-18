import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { WorkspaceCreateForm } from '@/components/workspace-create-form';
import { requireUser } from '@/lib/session';
import { getDefaultWorkspaceId } from '@/lib/workspaces';

export default async function AppHomePage() {
  const { user } = await requireUser();
  const workspaceId = await getDefaultWorkspaceId(user.id);
  if (workspaceId) {
    redirect(`/w/${workspaceId}/inbox`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
      <section className="card w-full p-6">
        <Logo className="mb-4" />
        <h1 className="text-2xl font-semibold">Create your first workspace</h1>
        <p className="mt-2 text-sm text-slate-400">
          Free plan includes 1 workspace, 1 location, and 50 AI generations per month.
        </p>
        <div className="mt-6">
          <WorkspaceCreateForm />
        </div>
      </section>
    </main>
  );
}
