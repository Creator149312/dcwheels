import React from "react";
import { TabsTrigger } from "./ui/tabs";
import {
  Shuffle,
  ArrowDownAZ,
  Brain,
  List,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import SettingsAdv from "./SettingsAdv";

const TabsListOnEditor = ({
  segData,
  resultList,
  wheelType,
  activeTab,
  onShuffle,
  onSort,
  onBatchImageUpload,
  onClearAll,
  onToggleMode,
}) => {
  const showBasicControls = wheelType === "basic" && activeTab === "list";

  return (
    <div className="flex w-full flex-col gap-1.5 pb-0.5">
      {/* Top Row: Tabs + Right Utilities */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/40">
          <TabsTrigger
            value="list"
            className="h-7 px-3 text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all cursor-pointer"
          >
            Entries <span className="ml-1.5 text-primary font-bold">{segData.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="result"
            className="h-7 px-3 text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all cursor-pointer"
          >
            Results <span className="ml-1.5 text-muted-foreground/60 font-semibold">{resultList.length}</span>
          </TabsTrigger>
        </div>

        <div className="flex items-center gap-0.5">
          <SettingsAdv
            showLabel={false}
            iconSize={16}
            triggerVariant="ghost"
            triggerClassName="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          />
          <button
            type="button"
            onClick={onToggleMode}
            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={wheelType === "quiz" ? "Switch to Basic Mode" : "Switch to Quiz Mode"}
          >
            {wheelType === "quiz" ? <List size={16} /> : <Brain size={16} />}
          </button>
        </div>
      </div>

      {/* Bottom Row: Utilities */}
      {showBasicControls && (
        <div className="flex w-full items-center justify-between text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onShuffle}
              className="flex items-center gap-1 h-6 px-2 rounded-md hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Shuffle entries randomly"
            >
              <Shuffle size={12} className="text-primary" />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={onSort}
              className="flex items-center gap-1 h-6 px-2 rounded-md hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Sort entries alphabetically"
            >
              <ArrowDownAZ size={13} className="text-primary" />
              <span>Sort</span>
            </button>
            <label
              className="flex items-center gap-1 h-6 px-2 rounded-md hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Add one or multiple image options"
            >
              <ImageIcon size={12} className="text-primary" />
              <span>Add image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onBatchImageUpload}
              />
            </label>
          </div>

          {segData.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-muted-foreground/60 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
              title="Clear all entries"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TabsListOnEditor;
