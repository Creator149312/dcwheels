import React from "react";
import { TabsTrigger } from "./ui/tabs";
import {
  Shuffle,
  ArrowDownAZ,
  Brain,
  List,
  Trash2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import SettingsAdv from "./SettingsAdv";

const TabsListOnEditor = ({
  segData,
  resultList,
  wheelType,
  activeTab,
  onCloseEditor,
  onShuffle,
  onSort,
  onBatchImageUpload,
  onClearAll,
  onToggleMode,
  showModeToggle = true,
}) => {
  const showBasicControls = wheelType === "basic" && activeTab === "list";

  return (
    <div className="flex w-full flex-col gap-2 pb-1">
      {/* Top Row: Tabs + Right Utilities */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
          <TabsTrigger
            value="list"
            className="h-9 sm:h-8 px-3.5 text-sm sm:text-xs font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all cursor-pointer touch-manipulation"
          >
            Entries <span className="ml-1.5 text-primary font-bold">{segData.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="result"
            className="h-9 sm:h-8 px-3.5 text-sm sm:text-xs font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all cursor-pointer touch-manipulation"
          >
            Results <span className="ml-1.5 text-muted-foreground/70 font-bold">{resultList.length}</span>
          </TabsTrigger>
        </div>

        <div className="flex items-center gap-1.5">
          <SettingsAdv
            showLabel={false}
            iconSize={18}
            triggerVariant="ghost"
            triggerClassName="flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-lg border border-border/50 bg-muted/40 text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation"
          />
          {showModeToggle && (
            <button
              type="button"
              onClick={onToggleMode}
              className={`flex items-center justify-center gap-1.5 h-9 px-2.5 sm:h-8 sm:px-2.5 rounded-lg border text-xs font-bold active:scale-95 transition-all cursor-pointer touch-manipulation ${
                wheelType === "quiz"
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={wheelType === "quiz" ? "Switch to Basic Mode" : "Switch to Quiz Mode"}
            >
              {wheelType === "quiz" ? (
                <>
                  <List size={16} />
                  <span>Basic</span>
                </>
              ) : (
                <>
                  <Brain size={16} />
                  <span>Quiz</span>
                </>
              )}
            </button>
          )}
          {onCloseEditor && (
            <button
              type="button"
              onClick={onCloseEditor}
              className="flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-lg border border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation"
              title="Close editor"
              aria-label="Close editor"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Utilities */}
      {showBasicControls && (
        <div className="flex w-full items-center justify-between gap-1.5 text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onShuffle}
              className="flex items-center gap-1.5 h-8 sm:h-7 px-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted active:scale-95 text-xs sm:text-xs font-semibold text-foreground transition-all cursor-pointer touch-manipulation"
              title="Shuffle entries randomly"
            >
              <Shuffle size={14} className="text-primary" />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={onSort}
              className="flex items-center gap-1.5 h-8 sm:h-7 px-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted active:scale-95 text-xs sm:text-xs font-semibold text-foreground transition-all cursor-pointer touch-manipulation"
              title="Sort entries alphabetically"
            >
              <ArrowDownAZ size={15} className="text-primary" />
              <span>Sort</span>
            </button>
            <label
              className="flex items-center gap-1.5 h-8 sm:h-7 px-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted active:scale-95 text-xs sm:text-xs font-semibold text-foreground transition-all cursor-pointer touch-manipulation"
              title="Add one or multiple image options"
            >
              <ImageIcon size={14} className="text-primary" />
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
              className="flex items-center gap-1 h-8 sm:h-7 px-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-muted-foreground hover:text-rose-600 hover:border-rose-500/30 active:scale-95 text-xs font-semibold transition-all cursor-pointer shrink-0 touch-manipulation"
              title="Clear all entries"
            >
              <Trash2 size={14} />
              <span className="sm:hidden">Clear</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TabsListOnEditor;
