import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { requireUser } from '@/lib/session';
import { listUserWorkspaces } from '@/lib/workspaces';
import { planDisplayName } from '@/lib/plans';
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher';
import { NavLinks } from '@/components/dashboard/nav-links';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

type LayoutProps = {
  children: React.ReactNode;
  params: { workspaceId: string };
};

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const { user } = await requireUser();
  const memberships = await listUserWorkspaces(user.id);
  const membership = memberships.find((item) => item.workspaceId === params.workspaceId);
  if (!membership) {
    redirect('/app');
  }

  const navItems = [
    { href: `/w/${params.workspaceId}/inbox`, label: 'Inbox' },
    { href: `/w/${params.workspaceId}/analytics`, label: 'Analytics' },
    { href: `/w/${params.workspaceId}/brand-voice`, label: 'Brand Voice' },
    { href: `/w/${params.workspaceId}/locations`, label: 'Locations' },
    { href: `/w/${params.workspaceId}/team`, label: 'Team' },
    { href: `/w/${params.workspaceId}/billing`, label: 'Billing' },
    { href: `/w/${params.workspaceId}/exports`, label: 'Exports' },
    { href: `/w/${params.workspaceId}/sources`, label: 'Sources' }
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/70">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden sm:inline-flex">
              <Logo withWordmark={false} className="items-center" />
            </Link>
            <div>
              <p className="text-sm font-medium">{membership.workspace.name}</p>
              <p className="text-xs text-slate-400">
                {planDisplayName(membership.workspace.plan)} plan - {membership.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WorkspaceSwitcher
              currentWorkspaceId={params.workspaceId}
              items={memberships.map((item) => ({
                workspaceId: item.workspaceId,
                workspaceName: item.workspace.name
              }))}
            />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 md:grid-cols-[220px_1fr]">
        <aside className="card h-fit p-3">
          <NavLinks items={navItems} />
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
