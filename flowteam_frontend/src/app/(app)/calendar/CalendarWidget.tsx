"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type React from "react";

type AnyEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: Record<string, unknown>;
};

type Props = {
  calendarRef: React.RefObject<{ getApi(): import("@fullcalendar/core").CalendarApi } | null>;
  view: string;
  events: AnyEvent[];
  onDatesSet: (arg: { view: { title: string }; startStr: string; endStr: string }) => void;
  onEventDrop: (info: {
    event: { id: string; extendedProps?: Record<string, unknown>; start: Date | null; startStr: string };
    revert?: () => void;
  }) => void;
  onEventClick: (info: { event: { id: string; title: string; startStr: string; endStr: string; extendedProps?: Record<string, unknown> } }) => void;
  onDateClick: (info: { dateStr: string }) => void;
  eventContent: (eventInfo: { event: { title: string; extendedProps?: Record<string, unknown> } }) => React.ReactNode;
};

export default function CalendarWidget({
  calendarRef,
  view,
  events,
  onDatesSet,
  onEventDrop,
  onEventClick,
  onDateClick,
  eventContent,
}: Props) {
  return (
    <FullCalendar
      ref={calendarRef as React.RefObject<FullCalendar>}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView={view}
      headerToolbar={false}
      events={events}
      datesSet={onDatesSet}
      editable={true}
      eventDrop={onEventDrop}
      height="100%"
      eventContent={eventContent}
      eventClick={onEventClick}
      dateClick={onDateClick}
    />
  );
}
