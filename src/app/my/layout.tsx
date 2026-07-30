import { redirect } from "next/navigation";
import { getPeerSession } from "@/lib/peer-session";
import { PeerHeader, PeerTabBar } from "@/components/layout/PeerHeader";

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPeerSession();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-cream">
      <PeerHeader userName={session.name} />
      {/* Bottom padding keeps content clear of the mobile tab bar. */}
      <main className="container mx-auto max-w-4xl px-4 py-6 pb-28 md:pb-10">
        {children}
      </main>
      <PeerTabBar />
    </div>
  );
}
