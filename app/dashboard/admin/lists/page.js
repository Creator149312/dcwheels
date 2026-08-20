"use client";

import { useEffect, useMemo, useState } from "react";

const API = "/api/admin/lists";

export default function AdminListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editing, setEditing] = useState(null);

  async function fetchLists() {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setLists(data.lists || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLists();
  }, []);

  async function deleteList(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`${API}?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLists((prev) => prev.filter((l) => l.name !== name));
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  }

  async function saveEdit(name, updates) {
    const res = await fetch(`${API}?name=${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setLists((prev) =>
        prev.map((l) => (l.name === name ? { ...l, ...updates } : l))
      );
      setEditing(null);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to save");
    }
  }

  const sources = useMemo(
    () => ["all", ...Array.from(new Set(lists.map((l) => l.source).filter(Boolean)))],
    [lists]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return lists.filter((list) => {
      const matchesSearch =
        !term ||
        list.name?.toLowerCase().includes(term) ||
        list.description?.toLowerCase().includes(term) ||
        list.tags?.some((t) => t.toLowerCase().includes(term));
      const matchesSource = sourceFilter === "all" || list.source === sourceFilter;
      return matchesSearch && matchesSource;
    });
  }, [lists, search, sourceFilter]);

  const totalItems = lists.reduce((sum, l) => sum + (l.itemCount || 0), 0);

  if (loading) return <div className="p-8">Loading lists...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">List Admin</h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {lists.length} lists · {totalItems.toLocaleString()} total items
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="/dashboard/admin/pipeline"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm text-center hover:opacity-90"
          >
            + Create new list
          </a>
          <input
            type="text"
            placeholder="Search name, description, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm min-w-[260px]"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {sources.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All sources" : s}
              </option>
            ))}
          </select>
          <button
            onClick={fetchLists}
            className="bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((list) => (
          <ListCard
            key={list.name}
            list={list}
            onDelete={() => deleteList(list.name)}
            onEdit={() => setEditing(list.name)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No lists match your search.
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          list={lists.find((l) => l.name === editing)}
          onClose={() => setEditing(null)}
          onSave={(updates) => saveEdit(editing, updates)}
        />
      )}
    </main>
  );
}

function ListCard({ list, onDelete, onEdit }) {
  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{list.name}</h2>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {list.description || "No description"}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {list.tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {list.itemCount} items · {list.source || "unknown"} ·{" "}
            {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : "no date"}
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <button
            onClick={onEdit}
            className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-sm bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ list, onClose, onSave }) {
  const [form, setForm] = useState({
    name: list.name || "",
    description: list.description || "",
    tags: (list.tags || []).join(", "),
  });

  function submit(e) {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Edit list</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border rounded-md px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
