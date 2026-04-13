"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "@components/ui/button";
import { useSession } from "@node_modules/next-auth/react";
import { FaMagic } from "@node_modules/react-icons/fa";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { useContext, useState } from "react";
import { usePathname } from "next/navigation";

import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";

const HOME_URL = "https://www.spinpapa.com";

const GenerateWheel = () => {
  const { status, data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const [list, setList] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTxt, setLoadingTxt] = useState("Generating...");
  const [progress, setProgress] = useState(0);
  const currentPath = usePathname();
  const isHomepage = currentPath === "/";

  const { setSegData, html, handleWheelSettingsChange, wheelData } =
    useContext(SegmentsContext);
  const [isPopupVisible, setIsPopupVisible] = useState(false); // State to control the popup visibility

  const handleUseWords = (generatedWords, colorCodes) => {
    const toJSONArray = ensureArrayOfObjects(generatedWords);
    setSegData(toJSONArray);
    html.current = toJSONArray
      .map((perSegData) => `<div>${perSegData.text}</div>`)
      .join("");

    handleWheelSettingsChange({ segColors: colorCodes });
  };

  const handleGenerateClick = async () => {
    if (!prompt) {
      toast.error("Please Enter a Prompt!");
      return;
    }
    if (status !== "authenticated") {
      toast.error("Please login to use Smart Wheel Builder!");
      return;
    }

    setLoading(true);
    setProgress(10); // Start progress at 10% to simulate loading
    setLoadingTxt("Curating Awesome Wheel for You...");
    try {
      const wordCount = 10;
      // Start API call
      const response = await fetch("/api/ai/generate-wheel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, wordCount }),
      });

      // Simulate progress update to 50% when API response is received
      setProgress(40);

      if (!response.ok) {
        throw new Error("Failed to generate list");
      }

      const data = await response.json();
      // console.log("DATA WORDS = " + data.words);
      // Simulate progress to 100% as we render the list
      setProgress(60);
      setList(data.words); // Assume response is { words: [...] }

      const colorCodes = await fetch("/api/ai/generate-theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const colcodes = await colorCodes.json();

      setTimeout(() => {
        handleUseWords(data.words, colcodes.colorCodes);
      }, 1500);

      // Simulate progress to 100% as we render the list
      setProgress(100);
      setLoadingTxt("Success! 🎉");
      
      setTimeout(() => {
        setLoading(false);
        handleClosePopup();
      }, 1000);
    } catch (error) {
      console.error(error);
      setProgress(0); // Reset progress on error
      setLoading(false);
    }
  };

  const handleClosePopup = () => {
    setIsPopupVisible(false); // Close popup when the user clicks "Close"
  };

  const handleOpenPopup = () => {
    setIsPopupVisible(true); // Show popup when "Smart Wheel" is clicked
  };

  return (
    <>
      {isHomepage && (
        <Dialog open={isPopupVisible} onOpenChange={setIsPopupVisible}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenPopup} className="shadow-sm">
              <FaMagic size={15} className="mr-2" />
              Smart Wheel
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl md:max-w-2xl bg-card border shadow-lg overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Smart Wheel Builder
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt in less than 25 words"
                disabled={loading}
                maxLength={100}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {loading && (
                <div className="flex flex-col items-center space-y-4">
                  <img
                    src="/spin-wheel-logo.png"
                    alt="Loading"
                    className="h-12 animate-spin"
                  />
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground">{loadingTxt}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                onClick={handleGenerateClick}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Generating..." : "Generate"}
              </Button>
              {!loading && (
                <Button
                  variant="outline"
                  onClick={handleClosePopup}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default GenerateWheel;
