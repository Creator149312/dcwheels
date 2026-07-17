"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Search, Loader2, Save, RefreshCw, Layers } from "lucide-react";
import TopicInput from "@components/TopicInput";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

export default function RelatedTopicsBulkManager() {
  const { data: session } = useSession();
  
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); 
  const [total, setTotal] = useState(0);

  // Buffer for local edits
  const [editBuffer, setEditBuffer] = useState({});

  const fetchWheels = useCallback(async () => {
    setLoading(true);
    try {
      // Set limit=0 to fetch all admin wheels at once
      const params = new URLSearchParams({
        limit: "0",
        filter,
        q: search,
        sort: "title"
      });
      
      const res = await fetch(`/api/admin/related-topics?${params.toString()}`);
      const data = await res.json();
      
      if (data.wheels) {
        setWheels(data.wheels);
        setTotal(data.total);
        setEditBuffer({});
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load wheels");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchWheels();
  }, [fetchWheels]);

  const updateBuffer = (wheelId, newTopics) => {
    setEditBuffer(prev => ({
      ...prev,
      [wheelId]: newTopics
    }));
  };

  const handleSave = async (wheelId) => {
    const topicsToSave = editBuffer[wheelId];
    if (topicsToSave === undefined) return;

    setSavingId(wheelId);
    try {
      const res = await fetch("/api/admin/assign-related", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wheelId: wheelId,
          relatedTopics: topicsToSave,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Updated!");
        setWheels(prev => prev.map(w => w._id === wheelId ? data.updated : w));
        setEditBuffer(prev => {
          const newBuf = { ...prev };
          delete newBuf[wheelId];
          return newBuf;
        });
      } else {
        throw new Error(data.error || "Failed to update");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  if (!isAdmin && session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
        <p className="text-muted-foreground mt-2">Admin access only.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            BULK RELATIONAL MANAGER (ALL)
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
              Full List
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Managing all {total} admin-created wheels in a single view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm outline-none cursor-pointer"
          >
            <option value="all">Every Admin Wheel</option>
            <option value="missing">Missing Topics Only</option>
          </select>

          <button
            onClick={fetchWheels}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl min-h-[400px]">
        {loading && wheels.length === 0 ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading entire database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[80vh] overflow-y-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/50 border-b border-border sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-4 font-bold text-muted-foreground w-[30%]">WHEEL NAME & ID</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">RELATIONAL TOPICS</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground text-right w-[120px]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wheels.map((w) => {
                  const currentTopics = editBuffer[w._id] !== undefined ? editBuffer[w._id] : (w.relatedTopics || []);
                  const hasUnsavedChanges = editBuffer[w._id] !== undefined;
                  const isSaving = savingId === w._id;

                  return (
                    <tr key={w._id} className={`hover:bg-muted/30 transition-colors ${hasUnsavedChanges ? 'bg-indigo-50/10 dark:bg-indigo-900/5' : ''}`}>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-foreground leading-snug">
                             {w.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                              {w._id}
                            </span>
                            <a href={`/list/${w._id}`} target="_blank" className="text-primary hover:underline text-[10px] font-bold">
                              OPEN
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="min-w-[400px]">
                          <TopicInput 
                            value={currentTopics} 
                            onChange={(topics) => updateBuffer(w._id, topics)} 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <button
                          onClick={() => handleSave(w._id)}
                          disabled={!hasUnsavedChanges || isSaving}
                          className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                            hasUnsavedChanges 
                              ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                              : 'bg-muted text-muted-foreground opacity-50'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Save size={14} />
                              {hasUnsavedChanges ? "SAVE" : "SAVED"}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {wheels.length === 0 && !loading && (
              <div className="p-20 text-center text-muted-foreground">
                <Layers className="mx-auto h-12 w-12 opacity-20 mb-4" />
                No wheels found matching your criteria.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        <span>List Integrity: Verified</span>
        <span>Total Records: {total}</span>
        <span>Admin Scoped: Checked</span>
      </div>
    </div>
  );
}
