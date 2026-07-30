import type { Metadata } from "next";
import { getPeerSession } from "@/lib/peer-session";
import { PeerDashboard } from "@/components/peer/PeerDashboard";

export const metadata: Metadata = {
  title: "Home",
};

export default async function MyHomePage() {
  const session = await getPeerSession();
  const firstName = session?.name?.split(" ")[0] ?? "there";

  return <PeerDashboard firstName={firstName} />;
}
