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
import { CloudUpload } from "lucide-react";
import Tooltip from "./Tooltip";
import { useSaveWheel } from "./useSaveWheel";
import TagInput from "./TagInput";

function useUrlTopic() {
  const [topic, setTopic] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type") || params.get("cr_type");
    const id = params.get("id") || params.get("cr_id");
    const tag = params.get("tag");

    if (
      type &&
      id &&
      ["anime", "movie", "game", "character", "custom"].includes(type)
    ) {
      setTopic({ type, id });
    } else if (tag) {
      // Fallback for generic tags if no cr_id is present
      setTopic({ type: "custom", id: tag });
    }
  }, []);
  return topic;
}

const TOPIC_TAG_MAP = {
  anime: ["anime", "manga", "otaku"],
  movie: ["movie", "cinema", "films"],
  game: ["gaming", "video games", "arcade"],
  character: ["cosplay", "fictional character"],
  custom: ["custom list", "personalized"],
};

export default function SaveWheelBtn({ segmentsData }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data: sessionData, status: sessionStatus } = useSession();
  const createdBy = sessionData?.user?.email;
  const sessionLoading = sessionStatus === "loading";
  const { segData, wheelData, wheelType } = useContext(SegmentsContext);

  const [showDataDialog, setShowDataDialog] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showUpdateDropdown, setShowUpdateDropdown] = useState(false);
  const urlTopic = useUrlTopic();

  // Initialize title/description with defaults if they're empty
  // and we have a topic to work with.
  useEffect(() => {
    if (showDataDialog && !selectedWheel) {
      if (!title) {
        if (urlTopic) {
          const suggested = `${urlTopic.id.charAt(0).toUpperCase() + urlTopic.id.slice(1).replace(/-/g, ' ')} Wheel`;
          setTitle(suggested);
        } else {
          setTitle("New Wheel");
        }
      }
      if (!description) {
        setDescription("This is my new wheel");
      }
    }
  }, [showDataDialog, selectedWheel, urlTopic, title, description]);

  // Suggested tags based on topic
  const suggestedTags = urlTopic ? TOPIC_TAG_MAP[urlTopic.type] || [] : [];

  const {
    savedWheels,
    fetchSavedWheels,
    saveWheel,
    isSaving,
    isLoading: wheelsLoading,
    error,
    setError,
  } = useSaveWheel({ createdBy, segData, wheelData, wheelType });

  const handleTagsChange = useCallback((t) => setSelectedTags(t), []);

  // If the user opted to overwrite an existing wheel, fetch their wheels.
  // Refetch when the dropdown is enabled or when they are in update mode and email becomes available.
  useEffect(() => {
    if (showDataDialog && (showUpdateDropdown || selectedWheel) && createdBy) {
      fetchSavedWheels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDataDialog, showUpdateDropdown, selectedWheel, createdBy]);

  // Clean state when dialog opens or closes
  useEffect(() => {
    if (!showDataDialog) {
      setShowUpdateDropdown(false);
      setSelectedWheel(null);
    }
  }, [showDataDialog]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await saveWheel({
      title,
      description,
      selectedWheel,
      selectedTopics: urlTopic ? [urlTopic] : [],
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
        <Button
          size="default"
          variant="default"
          disabled={isSaving}
          onClick={() => {
            setShowDataDialog(true);
          }}
          className="w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent transition-all duration-150"
        >
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <span>Save Wheel</span>
              <CloudUpload size={18} className="shrink-0" />
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-card rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedWheel ? "Update Your Wheel" : "Save Your Wheel"}</DialogTitle>
          <DialogDescription>
            {selectedWheel 
              ? "Update the details and segments of your existing wheel." 
              : "Store your wheel securely on the cloud to share or spin later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-4">
            {selectedWheel ? (
              <div className="space-y-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <Label className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                  Target: Update Existing Wheel
                </Label>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm max-w-[70%] truncate text-amber-700 dark:text-amber-300">
                    {selectedWheel.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWheel(null);
                      setTitle("New Wheel");
                      setDescription("This is my new wheel");
                      setSelectedTags([]);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset to Save as New
                  </button>
                </div>
              </div>
            ) : showUpdateDropdown ? (
              <div className="space-y-2 border border-border/80 bg-muted/20 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label htmlFor="update-wheel" className="text-sm font-semibold">
                    Select a Wheel to Overwrite
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateDropdown(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Cancel update
                  </button>
                </div>
                <select
                  id="update-wheel"
                  value={selectedWheel?._id || ""}
                  onChange={handleWheelChange}
                  disabled={sessionLoading || wheelsLoading}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {sessionLoading
                      ? "Loading session\u2026"
                      : wheelsLoading
                      ? "Loading your wheels\u2026"
                      : "-- Choose a stored wheel --"}
                  </option>
                  {savedWheels.length > 0 && (
                    <optgroup label="Your Saved Wheels">
                      {savedWheels.map((wheel) => (
                        <option key={wheel._id} value={wheel._id}>
                          {wheel.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {wheelsLoading && (
                  <p className="text-[10px] text-muted-foreground animate-pulse">
                    Connecting to database, please wait...
                  </p>
                )}
                {!wheelsLoading && savedWheels.length === 0 && createdBy && (
                  <p className="text-[11px] text-muted-foreground">
                    You don&apos;t have any saved wheels yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs px-1">
                <span className="text-muted-foreground">Saving as a brand new wheel.</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateDropdown(true);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Overwrite an existing wheel?
                </button>
              </div>
            )}

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
              <div className="flex justify-between items-center">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <span className={`text-[10px] ${description.length >= 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {description.length}/500
                </span>
              </div>
              <Textarea
                id="description"
                value={description}
                maxLength={500}
                placeholder="Give your wheel a clear description so others can find it."
                className="min-h-[100px] w-full resize-none pb-6"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <TagInput value={selectedTags} onChange={handleTagsChange} />
              
              {suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground mr-1 self-center">Suggestions:</span>
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!selectedTags.includes(tag)) {
                          handleTagsChange([...selectedTags, tag]);
                        }
                      }}
                      className="text-[10px] bg-secondary/50 hover:bg-secondary px-2 py-0.5 rounded-full transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              )}
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
