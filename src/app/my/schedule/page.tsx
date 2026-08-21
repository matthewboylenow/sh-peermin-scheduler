import { redirect } from "next/navigation";

/**
 * The personal schedule is switched off.
 *
 * It listed the events a peer minister had been assigned to a slot on, and
 * the parish is not using assignments — one assignment existed across 116
 * peer ministers, so everyone who opened this saw "no upcoming assignments"
 * and read it as a fault. The calendar and the sign-ups are where the
 * information actually lives.
 *
 * Kept as a redirect rather than deleted: bookmarks and old links exist, and
 * turning the feature back on is putting the entry back in PEER_NAV and
 * restoring this page. Nothing about assignments has been removed from the
 * database or the admin side.
 */
export default function PeerSchedulePage() {
  redirect("/my");
}
