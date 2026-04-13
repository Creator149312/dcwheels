"use client";

import { useState, useContext } from "react";
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

export default function SaveWheelBtn({ segmentsData }) {
  const [title, setTitle] = useState("New Wheel");
  const [description, setDescription] = useState("This is my new wheel");
  const createdBy = useSession().data?.user?.email;
  const { segData, wheelData, coins, setCoins } = useContext(SegmentsContext);

  const [showDataDialog, setShowDataDialog] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState(null);

  const {
    savedWheels,
    fetchSavedWheels,
    saveWheel,
    isSaving,
    error,
    setError,
  } = useSaveWheel({ createdBy, segData, wheelData, coins, setCoins });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await saveWheel({ title, description, selectedWheel, e });
    if (success) {
      setShowDataDialog(false);
    }
  };

  const handleWheelChange = (e) => {
    const wheel = savedWheels.find((w) => w._id === e.target.value);
    setSelectedWheel(wheel);
    setTitle(wheel ? wheel.title : "New Wheel");
    setDescription(wheel ? wheel.description : "This is my new wheel");
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
                fetchSavedWheels();
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

      <DialogContent className="sm:max-w-md bg-card rounded-xl">
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
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  Select a wheel to overwrite...
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
