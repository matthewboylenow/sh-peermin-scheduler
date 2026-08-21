"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
import { formatEventDate, formatTimeRange } from "@/lib/datetime";
import { EVENT_TYPES, eventTypeDot, eventTypeLabel } from "@/lib/event-types";

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  signupUrl: string | null;
}

/**
 * Public calendar, built to be dropped into the parish website in an iframe.
 *
 * Shows what is happening and when — no names, no sign-up state, nothing that
 * identifies a peer minister. Tapping an event opens its details in place
 * rather than navigating, since the host page owns the URL.
 *
 * Two layouts. A month grid on anything tablet-sized and up, and a plain
 * agenda list on phones: seven columns across 390px leaves ~49px per day,
 * which truncated every title to a letter and an ellipsis and gave a 39x20
 * tap target. A list has room for the title, the time and the place.
 */
export default function EmbedCalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selected, setSelected] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isPhone = useIsPhone();

  const gridStart = useMemo(() => startOfWeek(startOfMonth(cursor)), [cursor]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(cursor)), [cursor]);
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  // The agenda only ever shows the month itself, never the neighbouring days
  // the grid needs to fill its first and last rows.
  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFailed(false);

    const start = format(gridStart, "yyyy-MM-dd");
    const end = format(gridEnd, "yyyy-MM-dd");

    fetch(`/api/public/calendar?start=${start}&end=${end}`)
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json();
      })
      .then((data: PublicEvent[]) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gridStart, gridEnd]);

  const byDate = useMemo(() => {
    const map = new Map<string, PublicEvent[]>();
    for (const event of events) {
      const list = map.get(event.eventDate);
      if (list) list.push(event);
      else map.set(event.eventDate, [event]);
    }
    return map;
  }, [events]);

  /** Days in this month that actually have something on them, in order. */
  const agendaDays = useMemo(() => {
    const from = format(monthStart, "yyyy-MM-dd");
    const to = format(monthEnd, "yyyy-MM-dd");
    return [...byDate.keys()]
      .filter((key) => key >= from && key <= to)
      .sort()
      .map((key) => ({ key, events: byDate.get(key)! }));
  }, [byDate, monthStart, monthEnd]);

  /** Only the kinds present this month — a key to seven colours is noise. */
  const legend = useMemo(() => {
    const present = new Set(
      (isPhone
        ? agendaDays.flatMap((d) => d.events)
        : events.filter((e) => {
            const d = parse(e.eventDate, "yyyy-MM-dd", new Date());
            return d >= gridStart && d <= gridEnd;
          })
      ).map((e) => e.eventType)
    );
    return EVENT_TYPES.filter((t) => present.has(t.value));
  }, [events, agendaDays, isPhone, gridStart, gridEnd]);

  const showToday = !isSameMonth(cursor, new Date());

  /**
   * An iframe can't size itself, so publish our height to the host page. The
   * snippet on the parish site listens for this; if nobody is listening the
   * message is simply ignored and the iframe keeps its fixed height.
   */
  const publishHeight = useCallback(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const height = rootRef.current?.scrollHeight ?? document.body.scrollHeight;
    window.parent.postMessage(
      { type: "sh-calendar-height", height: Math.ceil(height) + 8 },
      "*"
    );
  }, []);

  useEffect(() => {
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener("resize", publishHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publishHeight);
    };
  }, [publishHeight, events, selected, isLoading, isPhone]);

  // Escape closes the details, the convention every dialog is expected to follow.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div ref={rootRef} className="bg-white p-3 sm:p-4">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-col items-center">
          <h2 className="font-heading text-lg font-bold text-navy sm:text-xl">
            {format(cursor, "MMMM yyyy")}
          </h2>
          {showToday && (
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="mt-0.5 flex items-center gap-1 text-xs font-medium text-navy hover:underline"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Back to today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {failed ? (
        <p className="py-10 text-center text-sm text-gray-500">
          The calendar couldn&apos;t be loaded right now. Please try again
          later.
        </p>
      ) : isPhone ? (
        /* ---------- Agenda, for phones ---------- */
        <div className="space-y-4">
          {agendaDays.map(({ key, events: dayEvents }) => {
            const day = parse(key, "yyyy-MM-dd", new Date());
            return (
              <section key={key}>
                <h3
                  className={`mb-1.5 text-xs font-bold uppercase tracking-wider ${
                    isToday(day) ? "text-rust" : "text-gray-500"
                  }`}
                >
                  {format(day, "EEEE, MMMM d")}
                  {isToday(day) && " · Today"}
                </h3>
                <div className="space-y-1.5">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelected(event)}
                      className="flex min-h-[56px] w-full items-stretch gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors active:bg-gray-50"
                    >
                      <span
                        className={`w-1 flex-shrink-0 rounded-full ${eventTypeDot(event.eventType)}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-gray-900">
                          {event.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-gray-600">
                          {formatTimeRange(event.startTime, event.endTime)}
                        </span>
                        {event.location && (
                          <span className="mt-0.5 block truncate text-sm text-gray-500">
                            {event.location}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 self-center text-gray-300" />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* ---------- Month grid, for tablets and up ---------- */
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = byDate.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);

              return (
                <div
                  key={key}
                  className={`min-h-[92px] rounded-lg border p-1 ${
                    inMonth
                      ? "border-gray-200 bg-white"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div
                    className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday(day)
                        ? "bg-navy text-white"
                        : inMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                    }`}
                  >
                    {format(day, "d")}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelected(event)}
                        className="flex w-full items-center gap-1 rounded bg-navy/5 px-1 py-0.5 text-left transition-colors hover:bg-navy/15"
                        title={event.title}
                      >
                        <span
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${eventTypeDot(event.eventType)}`}
                        />
                        <span className="truncate text-[11px] font-medium text-navy">
                          {event.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!failed && isLoading && (
        <p className="pt-3 text-center text-xs text-gray-400">Loading…</p>
      )}

      {!failed && !isLoading && (isPhone ? agendaDays.length === 0 : events.length === 0) && (
        <p className="py-6 text-center text-sm text-gray-500">
          Nothing scheduled this month.
        </p>
      )}

      {/* What the colours mean. Without this the pink and orange we added so
          things would stand out say nothing to a visitor. */}
      {legend.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
          {legend.map((type) => (
            <span
              key={type.value}
              className="flex items-center gap-1.5 text-xs text-gray-600"
            >
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${type.dot}`}
              />
              {type.label}
            </span>
          ))}
        </div>
      )}

      {/* Event details, in place — the host page owns the URL. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-navy">
                  {selected.title}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className={`h-2 w-2 rounded-full ${eventTypeDot(selected.eventType)}`}
                  />
                  {eventTypeLabel(selected.eventType)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                autoFocus
                className="-mr-1 -mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm font-medium text-gray-900">
              {formatEventDate(selected.eventDate, "long")}
            </p>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="h-4 w-4 flex-shrink-0" />
              {formatTimeRange(selected.startTime, selected.endTime)}
            </p>

            {selected.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                {selected.location}
              </p>
            )}

            {selected.description && (
              <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
                {selected.description}
              </p>
            )}

            {selected.signupUrl && (
              <a
                href={selected.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-navy px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-dark sm:w-auto"
              >
                Sign up for this event
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Phone-sized viewport. Starts false so the server and the first client render
 * agree; the grid is the safer thing to flash on a wide screen.
 */
function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isPhone;
}
