"use client";
import { useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Tabs, TabsContent, TabsList } from "@components/ui/tabs";
import TabsListOnEditor from "./TabsListOnEditor";
import ListSelector from "./lists/ListSelector";
import SegmentListEditor from "./SegmentListEditor";
import QuizSegmentEditor from "./QuizSegmentEditor";
import ContentEditableDivResult from "./ContentEditableDivResult";
import GenerateWheel from "@components/GenerateWheel";
import SaveImportComponent from "./SaveImportComponent";
import { FaBrain, FaListUl } from "react-icons/fa";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import { createSegment } from "@utils/segmentUtils";

// The full home-page editor — renders the tabbed interface with list/result
// editing, quiz authoring, AI generation, and import/save controls.
//
// Split out from WheelEditor so it ships as its own webpack chunk. On
// `/wheels/[slug]` and `/uwheels/[wheelId]` (where ~99% of search-driven
// traffic lands) this entire module — including ListSelector, the segment
// editors, the contentEditable result list, etc. — is never
// loaded, dropping ~30-60KB of JS from the initial bundle on those routes.
//
// Only mounted by WheelEditor when `currentPath === "/"` and only via
// next/dynamic, so SSR doesn't try to render any of these heavy widgets
// before the wheel itself is interactive.
export default function WheelEditorFull({ mustSpin, currentPath, inModal = false }) {
  const {
    resultList,
    segData,
    setSegData,
    html,
    advancedOptions,
    setadvancedOptions,
    prepareDataForEditorSwitch,
    wheelType,
    setWheelType,
  } = useContext(SegmentsContext);

  const [activeTab, setActiveTab] = useState("list");
  const [isVisible, setIsVisible] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const toggleVisibility = () => setIsVisible((prev) => !prev);

  const handleAdvancedToggle = () => {
    const nextValue = !advancedOptions;
    prepareDataForEditorSwitch(nextValue);
    setadvancedOptions(nextValue);
  };

  const toggleBulkMode = () => setBulkMode((prev) => !prev);

  const applyBulkText = () => {
    const lines = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const newSegments = lines.map((text) => createSegment(text));
    setSegData(newSegments);
    html.current = segmentsToHTMLTxt(newSegments);
    setBulkMode(false);
    setBulkText("");
  };

  const shuffleSegments = () => {
    const shuffled = [...segData].sort(() => Math.random() - 0.5);
    setSegData(shuffled);
    html.current = segmentsToHTMLTxt(shuffled);
  };

  const sortSegments = () => {
    const sorted = [...segData].sort((a, b) => {
      const aHasImg = !!a.image;
      const bHasImg = !!b.image;

      if (aHasImg && !bHasImg) return -1;
      if (!aHasImg && bHasImg) return 1;

      return (a.text || "").localeCompare(b.text || "");
    });

    setSegData(sorted);
    html.current = segmentsToHTMLTxt(sorted);
  };

  return (
    <div className={`bg-card text-card-foreground border shadow-sm p-2 lg:col-span-5 xl:col-span-3 rounded-2xl flex flex-col overflow-hidden${inModal ? " border-none shadow-none p-0 flex-1 min-h-0" : " lg:h-[500px] lg:max-h-[500px]"}`}>
      {/* Mode switcher */}
      <div className="flex items-center gap-1 mb-2 p-1 bg-muted rounded-xl shrink-0">
        <button
          onClick={() => {
            setBulkMode(false);
            setWheelType("basic");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
            wheelType !== "quiz"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FaListUl size={11} /> Basic Wheel
        </button>
        <button
          onClick={() => {
            setBulkMode(false);
            setWheelType("quiz");
            // Ensure all segments have quiz fields so QuizSegmentEditor
            // can render them without crashes or missing inputs.
            setSegData((prev) =>
              prev.map((seg) => ({
                ...seg,
                question: seg.question ?? "",
                options:
                  Array.isArray(seg.options) && seg.options.length > 0
                    ? seg.options
                    : ["", "", "", ""],
                correctIndex: seg.correctIndex ?? 0,
              }))
            );
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
            wheelType === "quiz"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FaBrain size={11} /> Quiz Mode
        </button>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
        style={{
          opacity: mustSpin ? 0.5 : 1,
          pointerEvents: mustSpin ? "none" : "auto",
          transition: "opacity 0.3s ease",
        }}
      >
        <TabsList className="w-full h-auto shrink-0 flex-wrap justify-between gap-2 rounded-2xl border border-border/60 bg-muted/40 p-2">
          <TabsListOnEditor
            segData={segData}
            resultList={resultList}
            isVisible={isVisible}
            toggleVisibility={toggleVisibility}
            advOptions={advancedOptions}
            wheelType={wheelType}
            activeTab={activeTab}
            bulkMode={bulkMode}
            onToggleBulkMode={toggleBulkMode}
            onToggleAdvanced={handleAdvancedToggle}
            onShuffle={shuffleSegments}
            onSort={sortSegments}
          />
        </TabsList>
        <TabsContent
          value="list"
          style={{
            display: isVisible && activeTab === "list" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div className="shrink-0">
            <ListSelector html={html} setSegData={setSegData} />
          </div>
          {wheelType === "quiz" ? (
            <div className="flex flex-col flex-1 min-h-0">
              <QuizSegmentEditor />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <SegmentListEditor
                bulkMode={bulkMode}
                bulkText={bulkText}
                setBulkText={setBulkText}
                applyBulkText={applyBulkText}
              />
            </div>
          )}
        </TabsContent>
        <TabsContent
          value="result"
          style={{ display: isVisible && activeTab === "result" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}
        >
          <ContentEditableDivResult resultList={resultList} />
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap justify-between items-center gap-2 mt-2 shrink-0">
        <GenerateWheel url={currentPath} />
        <SaveImportComponent segments={segData} onImport={setSegData} />
      </div>
    </div>
  );
}
