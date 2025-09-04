'use client';
import { useEffect, useState } from "react";

export default function AssignAnimePage() {
  const [wheels, setWheels] = useState([]);
  const [relatedInputs, setRelatedInputs] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    async function fetchWheels() {
      const res = await fetch("/api/admin/wheels-without-anime");
      const data = await res.json();
      setWheels(data.wheels || []);
    }
    fetchWheels();
  }, []);

  const handleInputChange = (wheelId, value) => {
    setRelatedInputs((prev) => ({ ...prev, [wheelId]: value }));
  };

  const handleSave = async (wheelId, wheelTitle) => {
    const animeId = relatedInputs[wheelId];
    if (!animeId) return;

    setSaving((prev) => ({ ...prev, [wheelId]: true }));

    const res = await fetch("/api/admin/assign-related", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wheelId,
        relatedTo: {
          type: "anime",
          id: animeId,
          title: wheelTitle,
        },
      }),
    });

    if (res.ok) {
      setWheels((prev) => prev.filter((w) => w._id !== wheelId));
    }

    setSaving((prev) => ({ ...prev, [wheelId]: false }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🛠 Assign Anime to Wheels</h1>
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Wheel Title</th>
            <th className="p-2 border">Anime ID</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {wheels.map((wheel) => (
            <tr key={wheel._id} className="border-t">
              <td className="p-2 border">{wheel.title}</td>
              <td className="p-2 border">
                <input
                  type="text"
                  className="border p-1 w-32"
                  placeholder="AniList ID"
                  value={relatedInputs[wheel._id] || ""}
                  onChange={(e) =>
                    handleInputChange(wheel._id, e.target.value)
                  }
                />
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => handleSave(wheel._id, wheel.title)}
                  disabled={saving[wheel._id]}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  {saving[wheel._id] ? "Saving..." : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
