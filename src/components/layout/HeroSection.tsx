"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function formatHeroDate(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatHeroTime(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type HeroAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
};

type HeroSectionProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: HeroAction;
  dateValue?: string;
  onDateChange?: (value: string) => void;
  showDatePicker?: boolean;
  extraContent?: ReactNode;
  backLink?: {
    href: string;
    label?: string;
  };
};

export default function HeroSection({
  title,
  description,
  icon,
  action,
  dateValue,
  onDateChange,
  showDatePicker = false,
  extraContent,
  backLink,
}: HeroSectionProps) {
  const [timestamp, setTimestamp] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = useMemo(() => formatHeroDate(timestamp), [timestamp]);
  const formattedTime = useMemo(() => formatHeroTime(timestamp), [timestamp]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-8 text-white shadow-2xl">
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 md:gap-4">
          {backLink ? (
            <Link
              href={backLink.href}
              className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white transition hover:bg-white/25"
              aria-label={backLink.label ?? "Volver"}
            >
              <span className="text-xl">←</span>
            </Link>
          ) : null}
          {icon ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-xl">
              {icon}
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {formattedDate}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-xl text-base text-white/80">
                {description}
              </p>
            ) : (
              <p className="mt-3 max-w-xl text-base text-white/80">
                {`${formattedDate} · ${formattedTime}`}
              </p>
            )}
          </div>
        </div>
        {extraContent ? <div className="text-white/90">{extraContent}</div> : null}
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {showDatePicker && onDateChange ? (
            <label className="flex w-full flex-col gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white/80 shadow-lg backdrop-blur sm:w-fit">
              <span>Seleccionar fecha</span>
              <input
                type="date"
                value={dateValue}
                onChange={(event) => onDateChange(event.target.value)}
                className="h-12 rounded-xl border border-white/30 bg-white/20 px-4 text-white outline-none backdrop-blur placeholder:text-white/70 focus:border-white focus:ring-2 focus:ring-white"
              />
            </label>
          ) : null}

          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-6 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
            >
              {action.icon ? <span className="text-base">{action.icon}</span> : null}
              {action.label}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-10 h-px w-full bg-gradient-to-r from-white/0 via-white/50 to-white/0" />
    </section>
  );
}
