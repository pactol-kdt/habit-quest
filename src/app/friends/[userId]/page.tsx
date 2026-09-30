import { FriendProfilePage } from "~/components/habitquest/friend-profile-page";

export default async function FriendProfileRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <FriendProfilePage userId={userId} />;
}
