"use client";

import { useEffect, useState } from "react";

export default function TestAITagsPage() {
  const [wheels, setWheels] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    // Load sample wheels (mock for now or fetch from API)
    setWheels([
      {
        _id: "1",
        title: "Naruto Heroic Journey Picker",
        tags: [],
      },
      {
        _id: "2",
        title: "Attack on Titan Characters Picker Wheel",
        tags: [],
      },
       {
        _id: "3",
        title: "Blue Lock Characters Picker Wheel",
        tags: [],
      },
    ]);
  }, []);

  const generateTags = async (wheel) => {
    setLoadingId(wheel._id);
    const res = await fetch("/api/ai/ai-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: wheel.title }),
    });

    const data = await res.json();
    if (data.tags) {
      // Update wheel tags locally
      const updated = wheels.map((w) =>
        w._id === wheel._id ? { ...w, tags: data.tags } : w
      );
      setWheels(updated);

    //   Optional: Send to your wheel DB update route
      await fetch("/api/wheel/update-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wheelId: wheel._id, tags: data.tags }),
      });
    }

    setLoadingId(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🧠 AI Tag Generator (Test Mode)</h1>
      <ul className="space-y-6">
        {wheels.map((wheel) => (
          <li key={wheel._id} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">{wheel.title}</h2>
            <div className="mb-2">
              <span className="font-medium">Tags:</span>{" "}
              {wheel.tags.length > 0 ? (
                <span className="text-blue-600">{wheel.tags}</span>
              ) : (
                <span className="text-gray-500">None</span>
              )}
            </div>
            <button
              onClick={() => generateTags(wheel)}
              disabled={loadingId === wheel._id}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {loadingId === wheel._id ? "Generating..." : "Generate Tags"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
