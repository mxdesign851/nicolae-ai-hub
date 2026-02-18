'use client';

import { Role } from '@prisma/client';
import { useState, useTransition } from 'react';

type Member = {
  id: string;
  role: Role;
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt?: string | Date;
  };
  joinedAt?: string | Date;
};

type Props = {
  workspaceId: string;
  members: Member[];
  canManageRoles: boolean;
  canInvite: boolean;
};

export function TeamManager({ workspaceId, members, canManageRoles, canInvite }: Props) {
  const [items, setItems] = useState(members);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [invite, setInvite] = useState<{ email: string; name: string; role: Role }>({
    email: '',
    name: '',
    role: Role.MEMBER
  });

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <article className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {canManageRoles ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((member) => (
              <tr key={member.id} className="border-b border-slate-900/70">
                <td className="px-4 py-3">{member.user.name || '-'}</td>
                <td className="px-4 py-3 text-slate-300">{member.user.email}</td>
                <td className="px-4 py-3">
                  {canManageRoles ? (
                    <select
                      className="input h-9 py-1"
                      value={member.role}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === member.id ? { ...row, role: event.target.value as Role } : row
                          )
                        )
                      }
                    >
                      {Object.values(Role).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    member.role
                  )}
                </td>
                {canManageRoles ? (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary px-3 py-1 text-xs"
                        onClick={() =>
                          startTransition(async () => {
                            setError(null);
                            setNotice(null);
                            const response = await fetch(`/api/workspaces/${workspaceId}/team`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ membershipId: member.id, role: member.role })
                            });
                            const json = await response.json();
                            if (!response.ok) {
                              setError(json.error || 'Unable to update role');
                              return;
                            }
                            setNotice('Role updated.');
                          })
                        }
                        disabled={pending}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary px-3 py-1 text-xs"
                        onClick={() =>
                          startTransition(async () => {
                            setError(null);
                            setNotice(null);
                            const response = await fetch(`/api/workspaces/${workspaceId}/team?membershipId=${member.id}`, {
                              method: 'DELETE'
                            });
                            const json = await response.json();
                            if (!response.ok) {
                              setError(json.error || 'Unable to remove member');
                              return;
                            }
                            setItems((prev) => prev.filter((row) => row.id !== member.id));
                            setNotice('Member removed.');
                          })
                        }
                        disabled={pending}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card p-4">
        <h2 className="text-lg font-semibold">Invite member</h2>
        <p className="mt-1 text-sm text-slate-400">Invite by email and assign a workspace role.</p>
        {canInvite ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setNotice(null);
              startTransition(async () => {
                const response = await fetch(`/api/workspaces/${workspaceId}/team`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(invite)
                });
                const json = await response.json();
                if (!response.ok) {
                  setError(json.error || 'Unable to invite member');
                  return;
                }
                setItems((prev) => [...prev, json]);
                setInvite({ email: '', name: '', role: Role.MEMBER });
                setNotice('Member added.');
              });
            }}
          >
            <input
              className="input"
              placeholder="member@example.com"
              type="email"
              required
              value={invite.email}
              onChange={(event) => setInvite((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Name (optional)"
              value={invite.name}
              onChange={(event) => setInvite((prev) => ({ ...prev, name: event.target.value }))}
            />
            <select
              className="input"
              value={invite.role}
              onChange={(event) => setInvite((prev) => ({ ...prev, role: event.target.value as Role }))}
            >
              {Object.values(Role).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button className="btn btn-primary w-full" disabled={pending}>
              {pending ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-amber-300">You do not have permission to manage team members.</p>
        )}
        {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </article>
    </section>
  );
}
