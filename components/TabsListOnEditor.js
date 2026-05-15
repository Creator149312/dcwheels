import React from "react";
import { TabsTrigger } from "./ui/tabs";
import { Eye, EyeOff, ClipboardList, Shuffle, ArrowDownAZ, Brain, List } from "lucide-react";
import SettingsAdv from "./SettingsAdv";

const TabsListOnEditor = ({
  segData,
  resultList,
  isVisible,
  toggleVisibility,
  advOptions,
  wheelType,
  activeTab,
  bulkMode,
  onToggleBulkMode,
  onToggleAdvanced,
  onShuffle,
  onSort,
  onToggleMode,
}) => {
  const showBasicControls =
    wheelType === "basic" && activeTab === "list" && isVisible;

  return (
    <div className="flex w-full flex-col gap-2 pb-0.5">
      {/* Top Row: Tabs + Right Utilities */}
      <div className="flex w-full items-center justify-between px-1">
        <div className="flex items-center gap-1 rounded-lg bg-background p-0.5">
          <TabsTrigger
            value="list"
            className="h-7 px-3 text-xs font-semibold rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground transition-all"
          >
            List <span className="ml-1.5 text-[#ffbe0b]">{segData.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="result"
            className="h-7 px-3 text-xs font-semibold rounded-md data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground transition-all"
          >
            Result <span className="ml-1.5 text-muted-foreground/60">{resultList.length}</span>
          </TabsTrigger>
        </div>

        <div className="flex items-center gap-1 bg-background rounded-lg p-0.5">
          <button
            type="button"
            onClick={toggleVisibility}
            className="flex items-center justify-center p-1.5 rounded-md text-foreground bg-background hover:bg-muted transition-colors shadow-sm"
            title={isVisible ? "Hide Editor" : "Show Editor"}
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <SettingsAdv
            advOptions={advOptions}
            showLabel={false}
            iconSize={18}
            triggerVariant="ghost"
            triggerClassName="flex items-center justify-center p-1.5 rounded-md text-foreground bg-background hover:bg-muted transition-colors shadow-sm"
          />
          <button
            type="button"
            onClick={onToggleMode}
            className="flex items-center justify-center p-1.5 rounded-md text-foreground bg-background hover:bg-muted transition-colors shadow-sm"
            title={wheelType === "quiz" ? "Switch to Basic Mode" : "Switch to Quiz Mode"}
          >
            {wheelType === "quiz" ? <List size={18} /> : <Brain size={18} />}
          </button>
        </div>
      </div>

      {/* Bottom Row: Utilities */}
      {showBasicControls && (
        <div className="flex items-center justify-between text-muted-foreground mt-1 px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShuffle}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted hover:text-foreground transition-colors"
              title="Shuffle Segments"
            >
              <Shuffle size={16} />
            </button>
            <button
              type="button"
              onClick={onSort}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted hover:text-foreground transition-colors"
              title="Sort A-Z"
            >
              <ArrowDownAZ size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <label
              className="flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground transition-colors"
              title="Toggle extra configuration fields"
            >
              <input
                type="checkbox"
                checked={!!advOptions}
                onChange={onToggleAdvanced}
                className="h-3 w-3 rounded-sm border-muted-foreground/40 accent-primary cursor-pointer"
              />
              <span className="text-[11px] font-medium tracking-wide">
                Advanced
              </span>
            </label>
            <button
              type="button"
              onClick={onToggleBulkMode}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <ClipboardList size={16} />
              {bulkMode ? "Close paste" : "Paste list"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabsListOnEditor;
