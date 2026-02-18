'use client';

import { useRouter } from 'next/navigation';

type Item = {
  workspaceId: string;
  workspaceName: string;
};

type Props = {
  currentWorkspaceId: string;
  items: Item[];
};

export function WorkspaceSwitcher({ currentWorkspaceId, items }: Props) {
  const router = useRouter();

  return (
    <select
      className="input h-9 max-w-[220px] py-1 text-xs"
      value={currentWorkspaceId}
      onChange={(event) => router.push(`/w/${event.target.value}/inbox`)}
    >
      {items.map((item) => (
        <option key={item.workspaceId} value={item.workspaceId}>
          {item.workspaceName}
        </option>
      ))}
    </select>
  );
}
