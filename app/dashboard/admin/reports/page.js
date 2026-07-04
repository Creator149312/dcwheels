"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Flag, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

const STATUS_OPTS = ["pending", "reviewed", "dismissed", "actioned"];
const STATUS_STYLES = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  reviewed:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  dismissed: "bg-muted text-muted-foreground",
  actioned:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const REASON_LABELS = {
  spam: "Spam / bot",
  harassment: "Harassment",
  nsfw: "NSFW",
  misinformation: "Misinformation",
  other: "Other",
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // reportId being updated

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?status=${statusFilter}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) fetchReports();
  }, [isAdmin, fetchReports]);

  const updateStatus = async (reportId, newStatus, adminNote = "") => {
    setUpdating(reportId);
    try {
      const res = await fetch("/api/report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: newStatus, adminNote }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Marked as ${newStatus}`);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      setTotal((t) => t - 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const banUser = async (report) => {
    // Shadow-ban by actioning the report — the /api/report route handles propagation.
    // Here we just mark the report actioned; real ban happens via shadowBanUser()
    // in the auto-threshold logic, but an admin can also call it directly.
    try {
      await fetch("/api/admin/shadow-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: report.targetType, targetId: report.targetId }),
      });
      await updateStatus(report._id, "actioned", "Admin manual shadow-ban");
      toast.success("User shadow-banned");
    } catch {
      toast.error("Ban failed");
    }
  };

  if (!session) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center text-destructive font-semibold">Access denied.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Flag size={20} className="text-destructive" />
          <h1 className="text-2xl font-bold">Content Reports</h1>
          {total > 0 && (
            <span className="ml-2 text-xs font-semibold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
              {total}
            </span>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
          <p>No {statusFilter} reports. The community is behaving. 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r._id}
              className="border border-border rounded-xl bg-card p-4 space-y-3"
            >
              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
                <span className="capitalize font-medium text-foreground">{r.targetType}</span>
                <span>·</span>
                <span className="bg-muted px-2 py-0.5 rounded font-semibold">
                  {REASON_LABELS[r.reason] || r.reason}
                </span>
                <span>·</span>
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Content snapshot */}
              {r.contentSnapshot && (
                <p className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2 line-clamp-3">
                  &ldquo;{r.contentSnapshot}&rdquo;
                </p>
              )}

              {/* IDs */}
              <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                <span>Target: {String(r.targetId)}</span>
              </div>

              {/* Action buttons */}
              {r.status === "pending" && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    disabled={updating === r._id}
                    onClick={() => updateStatus(r._id, "dismissed")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition disabled:opacity-50"
                  >
                    <XCircle size={14} /> Dismiss
                  </button>
                  <button
                    disabled={updating === r._id}
                    onClick={() => updateStatus(r._id, "reviewed")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition disabled:opacity-50"
                  >
                    <Clock size={14} /> Mark reviewed
                  </button>
                  <button
                    disabled={updating === r._id}
                    onClick={() => banUser(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition disabled:opacity-50"
                  >
                    <AlertTriangle size={14} /> Shadow-ban author
                  </button>
                  <a
                    href={r.targetType === "post" ? `/post/${r.targetId}` : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition"
                  >
                    View content ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
