"use client";

/**
 * ProfileActivityTimeline — Facebook-style unified activity stream.
 *
 * Renders spins, published wheels, and Ask dilemmas in a single
 * chronological timeline with colour-coded dots to distinguish types.
 *
 *  🔵 blue dot   — saved spin result
 *  🟢 green dot  — published a wheel
 *  🟣 purple dot — posted an Ask dilemma
 */

import Link from "next/link";
import Image from "next/image";
import { Timer, MessageCircleQuestion, LayoutGrid } from "lucide-react";
import { Disc3 } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";

// ── Dot colour per activity type ─────────────────────────────────────────
const DOT_COLOR = {
  spin:  "border-blue-500   bg-white dark:bg-[#1f1f1f]  shadow-blue-500/20",
  wheel: "border-green-500  bg-white dark:bg-[#1f1f1f]  shadow-green-500/20",
  ask:   "border-purple-500 bg-white dark:bg-[#1f1f1f]  shadow-purple-500/20",
};

// ── Type badge ────────────────────────────────────────────────────────────
const TYPE_BADGE = {
  spin: {
    icon: <Disc3 className="h-3 w-3" />,
    label: "Spin Result",
    cls: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",
  },
  wheel: {
    icon: <LayoutGrid className="h-3 w-3" />,
    label: "Published Wheel",
    cls: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  },
  ask: {
    icon: <MessageCircleQuestion className="h-3 w-3" />,
    label: "Asked Community",
    cls: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
  },
};

// ── Card sub-components ───────────────────────────────────────────────────

function SpinCard({ data }) {
  const wheelRoute =
    data.wheelId?.length === 24 ? `/uwheels/${data.wheelId}` : `/wheels/${data.wheelId}`;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Spun{" "}
        <Link href={wheelRoute} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
          {data.wheelTitle}
        </Link>{" "}
        and got{" "}
        <span className="font-bold text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
          {data.result}
        </span>
      </p>

      {data.resultImage && (
        <Link
          href={wheelRoute}
          className="group mt-2 w-full h-44 sm:h-56 relative rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-gray-50 dark:bg-gray-900 block"
        >
          <Image
            src={data.resultImage}
            alt={data.result || "Segment result"}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        </Link>
      )}

      {data.note && (
        <p className="text-sm text-gray-500 dark:text-gray-400 border-l-[3px] border-blue-200 dark:border-blue-900/50 pl-3 italic">
          &quot;{data.note}&quot;
        </p>
      )}

      <Link
        href={wheelRoute}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Disc3 className="h-3.5 w-3.5" /> Spin this wheel
      </Link>
    </div>
  );
}

function WheelCard({ data }) {
  const href = `/uwheels/${data._id}`;
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Published a new wheel:{" "}
        <Link href={href} className="font-semibold text-green-700 dark:text-green-300 hover:underline">
          {data.title}
        </Link>
      </p>
      {data.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{data.description}</p>
      )}
      {data.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline mt-1"
      >
        <LayoutGrid className="h-3.5 w-3.5" /> View wheel
      </Link>
    </div>
  );
}

function AskCard({ data }) {
  const href = `/ask/${data.id}`;
  const totalVotes = data.options?.reduce((s, o) => s + (o.voteCount || 0), 0) || 0;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {data.question}
      </p>

      {/* Top 2 options preview */}
      {data.options?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.options.slice(0, 2).map((opt) => (
            <span
              key={opt.id}
              className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-full px-3 py-1"
            >
              {opt.text}
            </span>
          ))}
          {data.options.length > 2 && (
            <span className="text-xs text-gray-400">+{data.options.length - 2} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        <Link
          href={href}
          className="font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
        >
          <MessageCircleQuestion className="h-3.5 w-3.5" /> Vote now
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function ProfileActivityTimeline({ decodedName, activities = [] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1a1a] p-12 text-center text-gray-500 dark:text-gray-400">
        <Timer className="mx-auto h-10 w-10 text-gray-400 mb-3 opacity-50" />
        <p className="font-medium text-gray-700 dark:text-gray-300">No activity yet</p>
        <p className="text-sm mt-1 max-w-xs mx-auto">
          When {decodedName} spins wheels, publishes them, or posts dilemmas, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 max-w-2xl">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/40 via-gray-200 to-transparent dark:from-blue-500/20 dark:via-gray-800 dark:to-transparent hidden sm:block" />

      {activities.map((activity, i) => {
        const badge = TYPE_BADGE[activity.type];
        const dotCls = DOT_COLOR[activity.type];

        return (
          <div key={`${activity.type}-${activity.data.id ?? activity.data._id ?? i}`} className="relative sm:pl-10">
            {/* Timeline dot */}
            <div
              className={`hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 shadow-sm ${dotCls}`}
            />

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1f1f1f] p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Card header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 ${badge.cls}`}>
                  {badge.icon}
                  {badge.label}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {timeAgo(activity.createdAt)}
                </span>
              </div>

              {/* Card body by type */}
              {activity.type === "spin"  && <SpinCard  data={activity.data} />}
              {activity.type === "wheel" && <WheelCard data={activity.data} />}
              {activity.type === "ask"   && <AskCard   data={activity.data} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
