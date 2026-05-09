"use client";
/**
 * ProfileBadges
 * Shows a user's earned badges in a compact chip grid.
 * Used on the public profile page.
 */
import { getBadge, TIER_META } from "@data/badgeRegistry";

export default function ProfileBadges({ badges }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        🏅 Badges Earned
      </h2>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => {
          const def = getBadge(b.badgeSlug);
          const tier = TIER_META[b.tier] || TIER_META.common;
          return (
            <div
              key={b._id}
              title={`${def.description || def.title}${b.spinResult ? ` — ${b.spinResult}` : ""}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium
                ${def.color} ${def.textColor} ${def.borderColor}`}
            >
              <span aria-hidden="true">{def.icon}</span>
              <span>{def.title}</span>
              <span className={`text-xs font-semibold ml-0.5 ${tier.color}`}>
                · {tier.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
