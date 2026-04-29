"use client";

import { useState, useContext, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "./ui/textarea";
import { FaCloudUploadAlt } from "react-icons/fa";
import Tooltip from "./Tooltip";
import { useSaveWheel } from "./useSaveWheel";
import TagInput from "./TagInput";

function useUrlTopic() {
  const [topic, setTopic] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const id = params.get("id");
    if (
      type &&
      id &&
      ["anime", "movie", "game", "character", "custom"].includes(type)
    ) {
      setTopic({ type, id });
    }
  }, []);
  return topic;
}

export default function SaveWheelBtn({ segmentsData }) {
  const [title, setTitle] = useState("New Wheel");
  const [description, setDescription] = useState("This is my new wheel");
  const { data: sessionData, status: sessionStatus } = useSession();
  const createdBy = sessionData?.user?.email;
  const sessionLoading = sessionStatus === "loading";
  const { segData, wheelData, coins, setCoins } = useContext(SegmentsContext);

  const [showDataDialog, setShowDataDialog] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const urlTopic = useUrlTopic();

  const {
    savedWheels,
    fetchSavedWheels,
    saveWheel,
    isSaving,
    error,
    setError,
  } = useSaveWheel({ createdBy, segData, wheelData, coins, setCoins });

  const handleTagsChange = useCallback((t) => setSelectedTags(t), []);

  // If the user opened the dialog before the session finished resolving,
  // fetchSavedWheels would have been a no-op (no email -> no user route).
  // Refetch as soon as the email becomes available so the "Update Existing
  // Wheel" dropdown actually populates without requiring a manual reopen.
  useEffect(() => {
    if (showDataDialog && createdBy) {
      fetchSavedWheels();
    }
    // fetchSavedWheels is recreated each render; tracking createdBy is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDataDialog, createdBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await saveWheel({
      title,
      description,
      selectedWheel,
      selectedTopics: [],
      selectedTags,
      e,
    });
    if (success) {
      setShowDataDialog(false);
    }
  };

  const handleWheelChange = (e) => {
    const wheel = savedWheels.find((w) => w._id === e.target.value);
    setSelectedWheel(wheel);
    setTitle(wheel ? wheel.title : "New Wheel");
    setDescription(wheel ? wheel.description : "This is my new wheel");
    setSelectedTags(
      wheel && Array.isArray(wheel.tags) ? [...wheel.tags] : []
    );
    setError(null);
  };

  return (
    <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center justify-center py-2 h-7 w-auto">
          <Tooltip text="Save Wheel on Cloud">
            <Button
              size="sm"
              variant="default"
              disabled={isSaving}
              onClick={() => {
                setShowDataDialog(true);
                // If session is still resolving, fetchSavedWheels would no-op
                // because createdBy is undefined. The useEffect below picks
                // it up once the email becomes available.
                if (createdBy) fetchSavedWheels();
              }}
              className="px-4 py-1 flex h-9 items-center gap-2 text-sm shadow-sm"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  Save <FaCloudUploadAlt size={18} />
                </>
              )}
            </Button>
          </Tooltip>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-card rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Wheel</DialogTitle>
          <DialogDescription>
            Store your wheel securely on the cloud.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="update-wheel" className="text-sm font-medium">
                Update Existing Wheel
              </Label>
              <select
                id="update-wheel"
                value={selectedWheel?._id || ""}
                onChange={handleWheelChange}
                disabled={sessionLoading}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  {sessionLoading
                    ? "Loading session\u2026"
                    : "Select a wheel to overwrite..."}
                </option>
                {savedWheels.map((wheel) => (
                  <option key={wheel._id} value={wheel._id}>
                    {wheel.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Wheel Title
              </Label>
              <Input
                id="name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a catchy title"
                maxLength={45}
                className="h-10 w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                maxLength={200}
                placeholder="What is this wheel for? (75 - 100 words)"
                className="min-h-[100px] w-full resize-none"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <TagInput value={selectedTags} onChange={handleTagsChange} />
            </div>

            {urlTopic && (
              <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
                <span className="text-muted-foreground">Linked to:</span>
                <span className="font-semibold capitalize">{urlTopic.type}</span>
                <span className="text-muted-foreground">#{urlTopic.id}</span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex sm:justify-between items-center">
            {error && (
              <p className="text-sm text-destructive flex-1 pr-4">{error}</p>
            )}
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Saving..." : selectedWheel ? "Update Wheel" : "Save as New"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
