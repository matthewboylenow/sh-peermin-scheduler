import { redirect } from "next/navigation";

/** Peer minister sign-in now lives at the root; keep old links working. */
export default function LoginRedirectPage() {
  redirect("/");
}
