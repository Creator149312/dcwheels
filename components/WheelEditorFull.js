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
import { Brain, List } from "lucide-react";
import { Suspense } from "react";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import { createSegment } from "@utils/segmentUtils";
import { compressImage } from "@utils/imageCompression";
import toast from "react-hot-toast";

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
    wheelType,
    setWheelType,
  } = useContext(SegmentsContext);

  const [activeTab, setActiveTab] = useState("list");

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

  const clearAllSegments = () => {
    setSegData([]);
    html.current = "";
  };

  const handleBatchImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    const toastId = toast.loading(
      `Processing ${files.length} image${files.length > 1 ? "s" : ""}...`
    );

    try {
      const newSegments = [];
      for (const file of files) {
        const compressed = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 400,
          useWebWorker: true,
        });
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(compressed);
        });
        const imageLandscape = await new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve(img.naturalWidth > img.naturalHeight);
          img.onerror = () => resolve(false);
          img.src = dataUrl;
        });

        const cleanName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim();

        newSegments.push(
          createSegment(cleanName || "Option", {
            image: dataUrl,
            imageLandscape,
          })
        );
      }

      setSegData((prev) => {
        // If current wheel has only 1 blank/default option, replace it
        if (
          prev.length === 1 &&
          (!prev[0].text || prev[0].text === "Option") &&
          !prev[0].image
        ) {
          const updated = newSegments.slice(0, 1000);
          html.current = segmentsToHTMLTxt(updated);
          return updated;
        }
        const updated = [...prev, ...newSegments].slice(0, 1000);
        html.current = segmentsToHTMLTxt(updated);
        return updated;
      });

      toast.success(
        `Added ${newSegments.length} image option${newSegments.length > 1 ? "s" : ""}!`,
        { id: toastId }
      );
    } catch (err) {
      console.warn("Batch image upload failed:", err);
      toast.error("Failed to process some images", { id: toastId });
    }
  };

  return (
    <div className={`bg-card text-card-foreground border shadow-sm p-1 lg:col-span-5 xl:col-span-3 rounded-2xl flex flex-col overflow-hidden ${inModal ? "border-none shadow-none p-0 flex-1 min-h-0" : "flex min-h-[32rem] lg:max-h-[521px]"}`}>
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
        <TabsList className="w-full h-auto shrink-0 flex-col gap-1 bg-transparent p-0 pb-1">
          <TabsListOnEditor
            segData={segData}
            resultList={resultList}
            wheelType={wheelType}
            activeTab={activeTab}
            onShuffle={shuffleSegments}
            onSort={sortSegments}
            onBatchImageUpload={handleBatchImageUpload}
            onClearAll={clearAllSegments}
            onToggleMode={() => {
              const newType = wheelType === "basic" ? "quiz" : "basic";
              setWheelType(newType);
              if (newType === "quiz") {
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
              }
            }}
          />
        </TabsList>
        <TabsContent
          value="list"
          style={{
            display: activeTab === "list" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div className="shrink-0 my-0.5">
            <ListSelector html={html} setSegData={setSegData} />
          </div>
          {wheelType === "quiz" ? (
            <div className="flex flex-col flex-1 min-h-0">
              <QuizSegmentEditor />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <SegmentListEditor />
            </div>
          )}
        </TabsContent>
        <TabsContent
          value="result"
          style={{ display: activeTab === "result" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}
        >
          <ContentEditableDivResult resultList={resultList} />
        </TabsContent>
      </Tabs>
      <div className="grid grid-cols-2 gap-1.5 mt-1 shrink-0">
        <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md" />}>
          <GenerateWheel url={currentPath} />
        </Suspense>
        <SaveImportComponent segments={segData} onImport={setSegData} />
      </div>
    </div>
  );
}
