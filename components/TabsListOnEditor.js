import React from "react";
import { TabsTrigger } from "./ui/tabs";
import {
  FaEye,
  FaEyeSlash,
  FaPencilRuler,
  FaClipboardList,
  FaRandom,
  FaSortAlphaDown,
} from "react-icons/fa";
import SettingsAdv from "./SettingsAdv";
import { cn } from "@/lib/utils";

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
}) => {
  const showBasicControls = wheelType === "basic" && activeTab === "list" && isVisible;

  const utilityButtonClass =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground";

  const activeUtilityButtonClass =
    "border-primary/30 bg-primary/10 text-foreground";

  const organizeButtonClass =
    "inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground";

  const countClass = (isActive) =>
    cn(
      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
      isActive
        ? "bg-primary-foreground/15 text-primary-foreground"
        : "bg-muted text-muted-foreground"
    );

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background/80 p-1 shadow-sm">
          <TabsTrigger
            value="list"
            className="h-8 gap-2 rounded-lg px-3 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <span>List</span>
            <span className={countClass(activeTab === "list")}>{segData.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="result"
            className="h-8 gap-2 rounded-lg px-3 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <span>Result</span>
            <span className={countClass(activeTab === "result")}>{resultList.length === 0 ? 0 : resultList.length}</span>
          </TabsTrigger>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleVisibility}
            className={utilityButtonClass}
            title={isVisible ? "Hide editor" : "Show editor"}
          >
            {isVisible ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
            <span>{isVisible ? "Hide" : "Show"}</span>
          </button>

          <SettingsAdv
            advOptions={advOptions}
            showLabel={true}
            iconSize={13}
            label="Customize"
            triggerVariant="outline"
            triggerClassName="h-8 gap-1.5 rounded-lg border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/40 hover:bg-accent hover:text-foreground"
          />
        </div>
      </div>

      {showBasicControls && (
        <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/80 p-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleAdvanced}
              aria-pressed={advOptions}
              className={cn(utilityButtonClass, advOptions && activeUtilityButtonClass)}
              title="Toggle advanced controls"
            >
              <FaPencilRuler size={12} />
              <span>Advanced</span>
            </button>

            <button
              type="button"
              onClick={onToggleBulkMode}
              aria-pressed={bulkMode}
              className={cn(utilityButtonClass, bulkMode && activeUtilityButtonClass)}
              title={bulkMode ? "Close paste mode" : "Paste a list of segments"}
            >
              <FaClipboardList size={12} />
              <span>{bulkMode ? "Close Paste" : "Paste List"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Organize
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={onShuffle}
                className={organizeButtonClass}
                title="Shuffle segments"
              >
                <FaRandom size={12} />
              </button>
              <button
                type="button"
                onClick={onSort}
                className={organizeButtonClass}
                title="Sort alphabetically"
              >
                <FaSortAlphaDown size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabsListOnEditor;
