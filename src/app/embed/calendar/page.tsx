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
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
import { formatEventDate, formatTimeRange } from "@/lib/datetime";
import { eventTypeDot } from "@/lib/event-types";

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
 * Public month calendar, built to be dropped into the parish website in an
 * iframe.
 *
 * Shows what is happening and when — no names, no sign-up state, nothing that
 * identifies a peer minister. Tapping an event opens its details in place
 * rather than navigating, since the host page owns the URL.
 */
export default function EmbedCalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selected, setSelected] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(cursor)),
    [cursor]
  );
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(cursor)), [cursor]);
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

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
  }, [publishHeight, events, selected, isLoading]);

  return (
    <div ref={rootRef} className="bg-white p-3 sm:p-4">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-heading text-lg font-bold text-navy sm:text-xl">
          {format(cursor, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-navy/10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {failed ? (
        <p className="py-10 text-center text-sm text-gray-500">
          The calendar couldn&apos;t be loaded right now. Please try again
          later.
        </p>
      ) : (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
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
                  className={`min-h-[62px] rounded-lg border p-1 sm:min-h-[92px] ${
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
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            eventTypeDot(event.eventType)
                          }`}
                        />
                        <span className="truncate text-[10px] font-medium text-navy sm:text-[11px]">
                          {event.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {isLoading && (
            <p className="pt-3 text-center text-xs text-gray-400">Loading…</p>
          )}

          {!isLoading && events.length === 0 && (
            <p className="pt-3 text-center text-sm text-gray-500">
              Nothing scheduled this month.
            </p>
          )}
        </>
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
              <h3 className="font-heading text-lg font-bold text-navy">
                {selected.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark sm:w-auto"
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
