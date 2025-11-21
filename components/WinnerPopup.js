"use client";
import { useEffect, useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "./ui/button";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import MCQQuestion from "@app/test/questions/MCQQuestion";
import PostForm from "./posts/PostForm";

const WinnerPopup = ({
  winner,
  prizeNumber,
  segData,
  setSegData,
  setShowCelebration,
  mustSpin,
}) => {
  let [open, setOpen] = useState(false);
  const { html, wheelData, wheelType, advancedOptions } =
    useContext(SegmentsContext);
  // const { userInputText, setUserInputText } = useContext(SegmentsContext);

  // console.log(" Prize Number in Winner Popup = " + prizeNumber);
  // console.log(" Auto Remove Winner", wheelData.removeWinnerAfterSpin);

useEffect(() => {
  if (mustSpin) return;

  const timeoutId = setTimeout(() => {
    const hasWinner = winner && winner !== "";

    setOpen(hasWinner);
    setShowCelebration(hasWinner);

    if (hasWinner && wheelData.removeWinnerAfterSpin) {
      removeWinner(false);
    }
  }, 200);

  return () => clearTimeout(timeoutId);
}, [winner, mustSpin]);

const removeWinner = (removeAll) => {
  const updatedSegData = segData.filter((element, index) =>
    removeAll
      ? element.text !== winner.text
      : !(element.text === winner.text && index === prizeNumber)
  );

  setSegData(updatedSegData);
  html.current = segmentsToHTMLTxt(updatedSegData);
  setOpen((prev) => !prev);
  setShowCelebration((prev) => !prev);
};

const setImgMaxWidth = (temphtml) => {
  if (typeof document === "undefined" || !temphtml) return temphtml;

  const div = document.createElement("div");
  div.innerHTML = temphtml.text;

  Array.from(div.getElementsByTagName("img")).forEach((img) => {
    img.style.width = "100px";
  });

  return div.innerHTML;
};

const containsDuplicates = (element) =>
  element
    ? segData.filter((item) => item.text === element.text).length > 1
    : false;


 const [showPostForm, setShowPostForm] = useState(false);

  const generateQuirkyMessage = (winner) => {
    const templates = [
      `The wheel chose... ${winner.text || winner}! My fate is sealed. 🌀`,
      `Brace yourselves, folks. The spin zone has spoken and declared: ${winner.text || winner}!`,
      `Well, wasn't that a surprise? The wheel has picked ${winner.text || winner} for me.`,
      `I'm putting all my trust in this wheel, and it gave me: ${winner.text || winner}. Here we go!`,
      `Apparently, my next adventure involves: ${winner.text || winner}. Wish me luck!`,
      `Just when I thought I had it all figured out, the wheel spun and said: ${winner.text || winner}.`,
      `Breaking news: The wheel has a new favorite. And it's ${winner.text || winner}.`,
    ];
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="fixed inset-0 bg-gray-800 bg-opacity-20 pointer-events-none" />

          {/* Modal Content */}
          <div className="relative z-10 w-11/12 max-w-lg mx-auto p-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <div className="text-center mb-4">
              <h2 className="text-xl mb-4 font-semibold text-gray-800 dark:text-gray-200">
                {wheelData.customPopupDisplayMessage}
              </h2>

              {/* Winner Display */}
              <div>
                {wheelType === "quiz" && winner?.question ? (
                  <MCQQuestion questionData={winner.question} />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span
                      className={`font-extrabold ${
                        winner?.text?.length > 50 ? "text-xl" : "text-2xl"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: setImgMaxWidth(winner),
                      }}
                    />
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end flex-wrap gap-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  setShowCelebration(false);
                }}
                variant="secondary"
              >
                Close
              </Button>

              {/* Share Button */}
              {/* <Button
                onClick={() => setShowPostForm(true)}
                variant="default"
              >
                Share
              </Button> */}

              {wheelType !== "quiz" && !wheelData.removeWinnerAfterSpin && (
                <>
                  <Button
                    onClick={() => removeWinner(false)}
                    variant="destructive"
                  >
                    Remove
                  </Button>
                  {containsDuplicates(segData[prizeNumber]) > 0 && (
                    <Button
                      onClick={() => removeWinner(true)}
                      variant="destructive"
                    >
                      Remove All
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Post Popup */}
      {showPostForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative p-6 bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full shadow-2xl">
            <button
              onClick={() => setShowPostForm(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Share your result</h2>
            <PostForm
              initialContent={generateQuirkyMessage(winner)}
              onClose={() => setShowPostForm(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default WinnerPopup;
