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
import RelatedWheels from "@app/test/relatedWheels/RelatedWheels";

export default function WheelEditor({
  mustSpin,
  currentPath,
  relatedWheels,
  isFullScreen,
}) {
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

  if (isFullScreen) return null;

  return (
    <div className="bg-card text-card-foreground border shadow-sm p-2 lg:col-span-5 xl:col-span-3 rounded-2xl">
      {currentPath === "/" ? (
        <>
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
        </>
      ) : (
        <div className="flex flex-col items-center">
          <RelatedWheels relatedWheels={relatedWheels} />
        </div>
      )}
    </div>
  );
}
