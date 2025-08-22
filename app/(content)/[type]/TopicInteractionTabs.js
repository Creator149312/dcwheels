"use client";
import { useState } from "react";
import CreateWheelButton from "./CreateWheelButton";

export default function TopicInteractionTabs({
  type,
  contentId,
  taggedWheels = [],
}) {
  const [activeTab] = useState("wheels"); // only one tab for now

  return (
    <section className="mt-6">
      {/* Header row with Create Wheel button */}
      <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 mb-4 pb-1">
        <span className="px-1 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
          🎡 Picker Wheels
        </span>
        <CreateWheelButton type={type} contentId={contentId} />
      </div>

      {/* Wheels List */}
      {taggedWheels.length > 0 ? (
        <div className="space-y-4">
          {taggedWheels.map((wheel) => (
            <a
              key={wheel._id}
              href={`/uwheels/${wheel._id}`}
              className="block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition p-4 rounded"
            >
              <h3 className="text-md font-semibold">{wheel.title}</h3>
              {wheel.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {wheel.description}
                </p>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 p-4 rounded mt-4 border border-yellow-300 dark:border-yellow-700">
          <p className="text-sm">
            No wheels found yet for this {type}. Be the first to create one and
            spark the conversation!
          </p>
        </div>
      )}
    </section>
  );
}
