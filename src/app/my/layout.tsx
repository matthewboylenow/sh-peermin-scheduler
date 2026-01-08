import { redirect } from "next/navigation";
import { getPeerSession } from "@/lib/peer-session";
import { PeerHeader } from "@/components/layout/PeerHeader";

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPeerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-cream">
      <PeerHeader userName={session.name} />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
