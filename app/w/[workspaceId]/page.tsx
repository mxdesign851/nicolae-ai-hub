import { redirect } from 'next/navigation';

export default function WorkspaceIndexPage({ params }: { params: { workspaceId: string } }) {
  redirect(`/w/${params.workspaceId}/inbox`);
}
