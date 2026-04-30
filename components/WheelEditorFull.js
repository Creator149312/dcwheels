"use client";
import { useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Tabs, TabsContent, TabsList } from "@components/ui/tabs";
import TabsListOnEditor from "./TabsListOnEditor";
import ListSelector from "./lists/ListSelector";
import EditorSwitchWithPopup from "./EditorSwitchWithPopup";
import SegmentListEditor from "./SegmentListEditor";
import QuizSegmentEditor from "./QuizSegmentEditor";
import ContentEditableDivResult from "./ContentEditableDivResult";
import GenerateWheel from "@components/GenerateWheel";
import SaveImportComponent from "./SaveImportComponent";

// The full home-page editor — renders the tabbed interface with list/result
// editing, quiz authoring, AI generation, and import/save controls.
//
// Split out from WheelEditor so it ships as its own webpack chunk. On
// `/wheels/[slug]` and `/uwheels/[wheelId]` (where ~99% of search-driven
// traffic lands) this entire module — including ListSelector, the segment
// editors, the contentEditable result list, GenerateWheel, etc. — is never
// loaded, dropping ~30-60KB of JS from the initial bundle on those routes.
//
// Only mounted by WheelEditor when `currentPath === "/"` and only via
// next/dynamic, so SSR doesn't try to render any of these heavy widgets
// before the wheel itself is interactive.
export default function WheelEditorFull({ mustSpin, currentPath }) {
  const {
    resultList,
    segData,
    setSegData,
    html,
    advancedOptions,
    setadvancedOptions,
    prepareDataForEditorSwitch,
    wheelType,
  } = useContext(SegmentsContext);

  const handleAdvancedToggle = (val) => {
    prepareDataForEditorSwitch(val);
    setadvancedOptions(val);
  };

  const [isVisible, setIsVisible] = useState(true);
  const toggleVisibility = () => setIsVisible((prev) => !prev);

  return (
    <div className="bg-card text-card-foreground border shadow-sm p-2 lg:col-span-5 xl:col-span-3 rounded-2xl">
      <Tabs
        defaultValue="list"
        style={{
          opacity: mustSpin ? 0.5 : 1,
          pointerEvents: mustSpin ? "none" : "auto",
          transition: "opacity 0.3s ease",
        }}
      >
        <TabsList className="w-full">
          <TabsListOnEditor
            segData={segData}
            resultList={resultList}
            isVisible={isVisible}
            toggleVisibility={toggleVisibility}
            advOptions={advancedOptions}
          />
        </TabsList>
        <TabsContent
          value="list"
          style={{ display: isVisible ? "block" : "none" }}
        >
          <ListSelector html={html} setSegData={setSegData} />
          {wheelType === "quiz" ? (
            <QuizSegmentEditor />
          ) : (
            <>
              <EditorSwitchWithPopup
                advOpt={advancedOptions}
                setAdvOpt={handleAdvancedToggle}
              />
              <SegmentListEditor />
            </>
          )}
        </TabsContent>
        <TabsContent
          value="result"
          style={{ display: isVisible ? "block" : "none" }}
        >
          <ContentEditableDivResult resultList={resultList} />
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap justify-between items-center">
        <GenerateWheel url={currentPath} />
        <SaveImportComponent segments={segData} onImport={setSegData} />
      </div>
    </div>
  );
}
