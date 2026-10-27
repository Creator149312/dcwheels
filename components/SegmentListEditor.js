"use client";
import {
  useContext,
  useState,
  useRef,
  useEffect,
  memo,
  useCallback,
} from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import {
  Trash2,
  Plus,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Copy,
  List,
  Clipboard,
  UploadCloud,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { compressImage } from "@utils/imageCompression";
import { createSegment } from "@utils/segmentUtils";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import toast from "react-hot-toast";

// Helper to compress and convert an image file to a base64 dataUrl
async function processImageFile(file) {
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

  return {
    image: dataUrl,
    imageLandscape,
    text: cleanName || "Option",
  };
}

// Memoized row — renders a clean entry with image pill, text, and controlled single-instance [⋮] settings popover
const SegmentRow = memo(function SegmentRow({
  seg,
  index,
  isMenuOpen,
  onMenuOpenChange,
  fallbackColor,
  inputRef,
  onUpdateText,
  onUpdateField,
  onDelete,
  onDuplicate,
  onImageUpload,
  onRemoveImage,
  onKeyDown,
  onPaste,
}) {
  const hasCustomSettings =
    (seg.weight !== undefined && seg.weight !== 1) ||
    !!seg.color ||
    seg.visible === false;

  // Local state for smooth, unthrottled typing with 100+ segments
  const [localText, setLocalText] = useState(seg.text || "");
  const debounceTimerRef = useRef(null);

  // Sync incoming external updates (like duplicate, import, paste, or reset)
  useEffect(() => {
    setLocalText(seg.text || "");
  }, [seg.text]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setLocalText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onUpdateText(index, val);
    }, 120);
  };

  const handleInputBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (localText !== seg.text) {
      onUpdateText(index, localText);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-1.5 px-1.5 sm:px-1 py-1.5 sm:py-0.5 rounded-lg sm:rounded-md group hover:bg-muted/40 focus-within:bg-muted/50 transition-colors border-b border-border/25 sm:border-none last:border-none">
      {/* Inline Image Thumbnail Pill */}
      {seg.image ? (
        <div
          className="relative w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md overflow-hidden shrink-0 border border-border/60 bg-muted shadow-2xs group/pill"
          title="Image attached (Tap or hover to change or remove)"
        >
          <img
            src={seg.image}
            alt=""
            className="w-full h-full object-cover select-none"
          />

          {/* Hover/Tap Overlay: Change or Detach */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/pill:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
            <label
              className="cursor-pointer text-white hover:text-primary p-1 sm:p-0.5 leading-none transition-colors"
              title="Change image"
            >
              <ImageIcon size={12} className="sm:w-[10px] sm:h-[10px]" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImageUpload(index, e.target.files[0])}
              />
            </label>
            <button
              type="button"
              onClick={(e) => onRemoveImage(e, index)}
              className="text-white hover:text-rose-400 font-bold text-xs sm:text-[10px] leading-none p-1 sm:p-0.5 transition-colors cursor-pointer"
              title="Remove image"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Blank Image Pill */
        <label
          className="w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md shrink-0 flex items-center justify-center bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/50 text-muted-foreground/60 hover:text-primary active:scale-95 transition-all cursor-pointer shadow-2xs touch-manipulation"
          title="Add image to this entry"
        >
          <ImageIcon size={15} className="sm:w-3 sm:h-3" strokeWidth={2} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImageUpload(index, e.target.files[0])}
          />
        </label>
      )}

      {/* Effortless Clean Text Input (text-base on mobile prevents iOS Safari auto-zoom) */}
      <input
        ref={inputRef}
        type="text"
        value={localText}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Commit immediately on enter
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            onUpdateText(index, localText);
          }
          onKeyDown(e, index);
        }}
        onPaste={(e) => onPaste(e, index)}
        placeholder={`Option ${index + 1}`}
        className={`flex-1 bg-transparent border-none outline-none text-base sm:text-sm py-1 sm:py-0.5 px-1.5 sm:px-1 min-w-0 font-medium placeholder:text-muted-foreground/40 focus:ring-0 transition-opacity ${
          seg.visible === false
            ? "text-muted-foreground/60 line-through decoration-muted-foreground/40"
            : "text-foreground"
        }`}
      />

      {/* 3-Dots Settings & Delete Popover (strictly one open at a time via parent state) */}
      <DropdownMenu
        open={isMenuOpen}
        onOpenChange={(open) => onMenuOpenChange(index, open)}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`relative w-8 h-8 sm:w-auto sm:h-auto sm:p-1 flex items-center justify-center rounded-lg sm:rounded-md transition-colors cursor-pointer shrink-0 touch-manipulation ${
              isMenuOpen || hasCustomSettings
                ? "text-primary bg-primary/10 sm:bg-transparent hover:bg-primary/10"
                : "text-muted-foreground/60 sm:text-muted-foreground/40 hover:text-foreground hover:bg-muted sm:opacity-60 group-hover:opacity-100"
            }`}
            title="Option settings"
          >
            <MoreVertical size={17} className="sm:w-[14px] sm:h-[14px]" />
            {hasCustomSettings && (
              <span
                className="absolute top-1 right-1 sm:top-0.5 sm:right-0.5 w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full bg-primary"
                title="Has custom settings (odds/color/hidden)"
              />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={5}
          className="z-[200] w-60 sm:w-52 p-2.5 sm:p-2 space-y-2 sm:space-y-1.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="text-[11px] sm:text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider px-1">
            Option Settings
          </div>

          {/* Odds / Weight Multiplier */}
          <div className="flex items-center justify-between px-1 py-1.5 sm:py-1 text-sm sm:text-xs">
            <span className="font-medium text-foreground">Odds / Weight</span>
            <div className="flex items-center gap-1.5 sm:gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const curr = Math.max(1, (seg.weight ?? 1) - 1);
                  onUpdateField(index, "weight", curr);
                }}
                className="w-7 h-7 sm:w-5 sm:h-5 rounded-md sm:rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 text-foreground font-bold text-sm sm:text-xs cursor-pointer active:scale-95 touch-manipulation"
                title="Decrease odds"
              >
                -
              </button>
              <span className="w-7 sm:w-6 text-center font-bold text-foreground text-sm sm:text-xs select-none">
                {seg.weight ?? 1}x
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const curr = Math.min(20, (seg.weight ?? 1) + 1);
                  onUpdateField(index, "weight", curr);
                }}
                className="w-7 h-7 sm:w-5 sm:h-5 rounded-md sm:rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 text-foreground font-bold text-sm sm:text-xs cursor-pointer active:scale-95 touch-manipulation"
                title="Increase odds"
              >
                +
              </button>
            </div>
          </div>

          {/* Slice Color */}
          <div className="flex items-center justify-between px-1 py-1.5 sm:py-1 text-sm sm:text-xs">
            <span className="font-medium text-foreground">Slice Color</span>
            <div className="flex items-center gap-2 sm:gap-1.5">
              {seg.color && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUpdateField(index, "color", null);
                  }}
                  className="text-xs sm:text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  title="Reset to theme palette"
                >
                  Reset
                </button>
              )}
              <input
                type="color"
                value={seg.color || fallbackColor}
                onChange={(e) => onUpdateField(index, "color", e.target.value)}
                className="w-7 h-7 sm:w-5 sm:h-5 p-0 border border-border/80 rounded-md sm:rounded cursor-pointer bg-transparent"
                title="Change slice color"
              />
            </div>
          </div>

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpdateField(index, "visible", seg.visible === false ? true : false);
            }}
            className="w-full flex items-center justify-between px-1 py-1.5 sm:py-1 rounded-md hover:bg-muted text-sm sm:text-xs transition-colors cursor-pointer touch-manipulation"
            title="Toggle visibility on the wheel"
          >
            <span className="font-medium text-foreground">Visibility</span>
            <span
              className={`flex items-center gap-1 text-xs sm:text-[11px] font-semibold ${
                seg.visible !== false ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {seg.visible !== false ? <Eye size={14} className="sm:w-3 sm:h-3" /> : <EyeOff size={14} className="sm:w-3 sm:h-3" />}
              {seg.visible !== false ? "Visible" : "Hidden"}
            </span>
          </button>

          {seg.image && (
            <button
              type="button"
              onClick={(e) => {
                onRemoveImage(e, index);
              }}
              className="w-full flex items-center justify-between px-1 py-1.5 sm:py-1 rounded-md hover:bg-muted text-sm sm:text-xs text-rose-500 transition-colors cursor-pointer touch-manipulation"
            >
              <span className="font-medium">Remove Image</span>
              <span className="text-xs font-bold">✕</span>
            </button>
          )}

          <div className="my-1 border-t border-border/60" />

          {/* Duplicate Option */}
          <DropdownMenuItem
            onClick={() => onDuplicate(index)}
            className="flex items-center gap-2 px-2 py-2 sm:px-1.5 sm:py-1.5 rounded-lg text-sm sm:text-xs cursor-pointer"
          >
            <Copy size={15} className="text-muted-foreground sm:w-[13px] sm:h-[13px]" />
            <span>Duplicate Option</span>
          </DropdownMenuItem>

          {/* Delete Option */}
          <DropdownMenuItem
            onClick={() => onDelete(index)}
            className="flex items-center gap-2 px-2 py-2 sm:px-1.5 sm:py-1.5 rounded-lg text-sm sm:text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
          >
            <Trash2 size={15} className="sm:w-[13px] sm:h-[13px]" />
            <span>Delete Option</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export default function SegmentListEditor() {
  const {
    segData,
    setSegData,
    html,
    wheelData,
  } = useContext(SegmentsContext);

  const [isDragging, setIsDragging] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const inputRefs = useRef([]);
  const scrollContainerRef = useRef(null);
  const hiddenBatchFileInputRef = useRef(null);
  const segDataRef = useRef(segData);

  const handleMenuOpenChange = useCallback((index, isOpen) => {
    setOpenMenuIndex((prev) => (isOpen ? index : prev === index ? null : prev));
  }, []);

  useEffect(() => {
    segDataRef.current = segData;
  }, [segData]);

  // Update text of a specific segment
  const handleUpdateText = useCallback(
    (index, value) => {
      setSegData((prev) => {
        const next = prev.map((s, i) => (i === index ? { ...s, text: value } : s));
        return next;
      });
    },
    [setSegData]
  );

  // Update arbitrary field (weight, color, visible)
  const handleUpdateField = useCallback(
    (index, field, value) => {
      setSegData((prev) => {
        const next = prev.map((s, i) =>
          i === index ? { ...s, [field]: value } : s
        );
        return next;
      });
    },
    [setSegData]
  );

  // Delete segment
  const handleDeleteSegment = useCallback(
    (index) => {
      setSegData((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next;
      });
    },
    [setSegData]
  );

  // Duplicate segment
  const handleDuplicate = useCallback(
    (index) => {
      setSegData((prev) => {
        if (prev.length >= 1000) {
          toast.error("Maximum 1,000 entries allowed");
          return prev;
        }
        const duplicate = JSON.parse(JSON.stringify(prev[index]));
        duplicate.id = createSegment().id;
        const next = [...prev];
        next.splice(index + 1, 0, duplicate);
        return next;
      });
    },
    [setSegData]
  );

  // Upload/change image on a segment
  const handleImageUpload = useCallback(
    async (index, file) => {
      if (!file) return;
      try {
        const { image, imageLandscape } = await processImageFile(file);
        setSegData((prev) => {
          const next = prev.map((s, i) =>
            i === index ? { ...s, image, imageLandscape } : s
          );
          return next;
        });
      } catch (err) {
        console.warn("Image upload failed:", err);
        toast.error("Image upload failed. Please try again.");
      }
    },
    [setSegData]
  );

  // Detach image from segment
  const handleRemoveImage = useCallback(
    (e, index) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setSegData((prev) => {
        const next = prev.map((s, i) =>
          i === index ? { ...s, image: null, imageLandscape: false } : s
        );
        return next;
      });
    },
    [setSegData]
  );

  // Insert segment at target index
  const insertSegmentAt = useCallback(
    (targetIndex, initialText = "", overrides = {}) => {
      setSegData((prev) => {
        if (prev.length >= 1000) {
          toast.error("Maximum 1,000 entries allowed");
          return prev;
        }
        const newSeg = createSegment(initialText, overrides);
        const next = [...prev];
        next.splice(targetIndex, 0, newSeg);
        return next;
      });
    },
    [setSegData]
  );

  // Automatically keep html.current synchronized with segData changes
  // via a clean effect rather than mutating inside pure reducers.
  useEffect(() => {
    if (html && html.current !== undefined && Array.isArray(segData)) {
      html.current = segmentsToHTMLTxt(segData);
    }
  }, [segData, html]);

  // Effortless Keyboard Flow: Enter, Backspace, Arrow keys
  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key === "Enter") {
        e.preventDefault();
        insertSegmentAt(index + 1);
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 20);
      } else if (e.key === "Backspace") {
        const currentList = segDataRef.current || [];
        const currentSeg = currentList[index];
        // If cursor is at start of input and text is empty
        if (
          e.target.selectionStart === 0 &&
          e.target.selectionEnd === 0 &&
          (!currentSeg?.text || currentSeg.text === "")
        ) {
          if (currentSeg?.image) {
            // Detach image first
            e.preventDefault();
            handleRemoveImage(null, index);
          } else if (currentList.length > 1) {
            e.preventDefault();
            handleDeleteSegment(index);
            const prevIndex = Math.max(0, index - 1);
            setTimeout(() => {
              const prevInput = inputRefs.current[prevIndex];
              if (prevInput) {
                prevInput.focus();
                const len = prevInput.value.length;
                prevInput.setSelectionRange(len, len);
              }
            }, 20);
          }
        }
      } else if (e.key === "ArrowUp") {
        if (index > 0) {
          e.preventDefault();
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === "ArrowDown") {
        const currentList = segDataRef.current || [];
        if (index < currentList.length - 1) {
          e.preventDefault();
          inputRefs.current[index + 1]?.focus();
        }
      }
    },
    [insertSegmentAt, handleDeleteSegment, handleRemoveImage]
  );

  // Paste handling on a specific row
  const handlePasteOnRow = useCallback(
    async (e, index) => {
      // 1. If an image is pasted from clipboard
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              await handleImageUpload(index, file);
              toast.success("Image attached to option");
              return;
            }
          }
        }
      }

      // 2. If multiline text is pasted
      const text = e.clipboardData?.getData("text");
      if (text && text.includes("\n")) {
        e.preventDefault();
        const lines = text
          .split(/[\r\n]+/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) return;

        setSegData((prev) => {
          const firstLine = lines[0];
          const remainingSegments = lines
            .slice(1)
            .map((line) => createSegment(line));

          const next = [...prev];
          if (next[index]) {
            next[index] = { ...next[index], text: firstLine };
          } else {
            next.push(createSegment(firstLine));
          }
          next.splice(index + 1, 0, ...remainingSegments);
          const sliced = next.slice(0, 1000);
          return sliced;
        });

        toast.success(`Pasted ${lines.length} lines`);
      }
    },
    [handleImageUpload, setSegData]
  );

  // Global clipboard paste button
  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        toast.error("Clipboard is empty");
        return;
      }
      const lines = clipText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) return;

      setSegData((prev) => {
        const newSegments = lines.map((l) => createSegment(l));
        // If only 1 blank/default segment exists, replace it
        if (
          prev.length === 1 &&
          (!prev[0].text || prev[0].text === "Option") &&
          !prev[0].image
        ) {
          return newSegments.slice(0, 1000);
        }
        return [...prev, ...newSegments].slice(0, 1000);
      });

      toast.success(`Pasted ${lines.length} items`);
    } catch {
      toast("Use Ctrl+V directly inside any option to paste");
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    try {
      const files = Array.from(e.dataTransfer?.files || []);

      // If image files are dropped
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        const toastId = toast.loading(
          `Processing ${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""}...`
        );
        const newSegments = [];
        for (const file of imageFiles) {
          const processed = await processImageFile(file);
          newSegments.push(
            createSegment(processed.text, {
              image: processed.image,
              imageLandscape: processed.imageLandscape,
            })
          );
        }

        setSegData((prev) => {
          if (
            prev.length === 1 &&
            (!prev[0].text || prev[0].text === "Option") &&
            !prev[0].image
          ) {
            return newSegments.slice(0, 1000);
          }
          return [...prev, ...newSegments].slice(0, 1000);
        });

        toast.success(
          `Added ${newSegments.length} image option${newSegments.length > 1 ? "s" : ""}!`,
          { id: toastId }
        );
        return;
      }

      // If text/csv/json files are dropped
      if (files.length > 0) {
        const textFile = files[0];
        const content = await textFile.text();
        let importedLines = [];

        if (textFile.name.endsWith(".json")) {
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              importedLines = parsed
                .map((item) =>
                  typeof item === "string" ? item : item?.text || item?.name || ""
                )
                .filter(Boolean);
            }
          } catch {}
        }

        if (importedLines.length === 0) {
          importedLines = content
            .split(/[\r\n]+/)
            .map((line) => line.replace(/^["']|["']$/g, "").trim())
            .filter(Boolean);
        }

        if (importedLines.length > 0) {
          setSegData((prev) => {
            const newSegments = importedLines.map((l) => createSegment(l));
            if (
              prev.length === 1 &&
              (!prev[0].text || prev[0].text === "Option") &&
              !prev[0].image
            ) {
              return newSegments.slice(0, 1000);
            }
            return [...prev, ...newSegments].slice(0, 1000);
          });
          toast.success(`Imported ${importedLines.length} choices from ${textFile.name}`);
        }
        return;
      }

      // If text is dropped
      const droppedText = e.dataTransfer.getData("text");
      if (droppedText) {
        const lines = droppedText
          .split(/[\r\n]+/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          setSegData((prev) => {
            const newSegments = lines.map((l) => createSegment(l));
            return [...prev, ...newSegments].slice(0, 1000);
          });
          toast.success(`Imported ${lines.length} items`);
        }
      }
    } catch (err) {
      console.warn("Drop handling error:", err);
      toast.error("Could not read dropped content");
    }
  };

  const addBlankOption = () => {
    insertSegmentAt(segData.length);
    setTimeout(() => {
      inputRefs.current[segData.length]?.focus();
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 20);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col flex-1 min-h-0 transition-all ${
        isDragging
          ? "border-2 border-dashed border-primary bg-primary/5 rounded-xl"
          : ""
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-background/90 backdrop-blur-xs pointer-events-none text-primary">
          <UploadCloud size={30} className="animate-bounce mb-2" />
          <p className="text-sm font-bold">Drop files or images to import</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Images, TXT, CSV, or copied lists
          </p>
        </div>
      )}

      {/* Segment rows container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-0.5 py-1 px-0.5 select-none [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/25 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/45"
      >
        {segData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60">
              <List size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Wheel is empty</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                Type options, upload images, or drop a list directly into this area.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={addBlankOption}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={14} /> Add Option
              </button>
              <label
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <ImageIcon size={14} /> Add Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const newSegs = [];
                    for (const f of files) {
                      const res = await processImageFile(f);
                      newSegs.push(createSegment(res.text, { image: res.image, imageLandscape: res.imageLandscape }));
                    }
                    setSegData(newSegs.slice(0, 1000));
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-2xs hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
              >
                <Clipboard size={14} /> Paste List
              </button>
            </div>
          </div>
        ) : (
          segData.map((seg, index) => (
            <SegmentRow
              key={seg.id ?? index}
              seg={seg}
              index={index}
              isMenuOpen={openMenuIndex === index}
              onMenuOpenChange={handleMenuOpenChange}
              fallbackColor={
                wheelData.segColors[index % wheelData.segColors.length]
              }
              inputRef={(el) => (inputRefs.current[index] = el)}
              onUpdateText={handleUpdateText}
              onUpdateField={handleUpdateField}
              onDelete={handleDeleteSegment}
              onDuplicate={handleDuplicate}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteOnRow}
            />
          ))
        )}
      </div>

      {/* Bottom Bar: Action buttons & entry count */}
      <div className="shrink-0 flex items-center justify-between px-1 pt-2 pb-1 border-t border-border/40 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addBlankOption}
            className="flex items-center gap-1.5 h-9 sm:h-7 px-3 sm:px-2 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary font-bold text-xs sm:text-xs active:scale-95 transition-all cursor-pointer touch-manipulation"
          >
            <Plus size={15} className="sm:w-[13px] sm:h-[13px]" strokeWidth={2.5} />
            <span>Add Option</span>
          </button>
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="flex items-center gap-1.5 h-9 sm:h-7 px-3 sm:px-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted hover:text-foreground text-foreground font-semibold text-xs sm:text-xs active:scale-95 transition-all cursor-pointer touch-manipulation"
            title="Paste text list from clipboard"
          >
            <Clipboard size={14} className="sm:w-[12px] sm:h-[12px]" />
            <span>Paste List</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="font-bold text-foreground">{segData.length}</span>
          <span>{segData.length === 1 ? "entry" : "entries"}</span>
          {segData.length >= 1000 && (
            <span className="text-amber-500 font-bold ml-1">(Max 1000)</span>
          )}
        </div>
      </div>
    </div>
  );
}
