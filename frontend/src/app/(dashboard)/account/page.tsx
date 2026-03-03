import { getServerUser } from "@/lib/server-api";
import { AccountView } from "@/modules/account/views/account-view";

export default async function AccountPage() {
  const initialUser = await getServerUser();

  return <AccountView initialUser={initialUser} />;
}
