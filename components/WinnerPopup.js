"use client";
import { useEffect, useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "./ui/button";

const WinnerPopup = ({
  winner,
  prizeNumber,
  segData,
  setSegData,
  setShowCelebration,
  mustSpin,
}) => {
  let [open, setOpen] = useState(false);
  const { html } = useContext(SegmentsContext);
  // const { userInputText, setUserInputText } = useContext(SegmentsContext);

  useEffect(() => {
    if (!mustSpin) {
      const timeoutId = setTimeout(() => {
        if (winner !== "" && winner !== undefined) {
          setOpen(true);
          setShowCelebration(true);
        } else {
          setOpen(false);
          setShowCelebration(false);
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [winner, mustSpin]);

  function joinWithNewlines(stringArray) {
    // Handle empty array case
    if (!stringArray || stringArray.length === 0) {
      return "";
    }

    if (stringArray.length > 1) {
      // Join all elements except the last with newlines
      const joinedWithNewlines = stringArray.slice(0, -1).join("\n");

      // Concatenate with the last element and another newline
      return joinedWithNewlines + "\n" + stringArray[stringArray.length - 1];
    } else {
      return stringArray[0] + "\n";
    }
  }

  const removeWinner = (ifRemoveAll) => {
    let updatedSegData = null;
    if (ifRemoveAll) {
      updatedSegData = segData.filter((element) => element !== winner);
      // Filter out element with value 3
    } else {
      updatedSegData = segData.filter(
        (element, index) => !(element === winner && index === prizeNumber)
      );
    }
    setSegData(updatedSegData);

    html.current = updatedSegData
      .map((perSegData) => `<div>${perSegData}</div>`)
      .join("");
    setOpen(!open);
    setShowCelebration(!open);
  };

  const setImgMaxWidth = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const imgs = div.getElementsByTagName("img");
    Array.from(imgs).forEach((img) => {
      img.style.width = "100px";
    });
    return div.innerHTML;
  };

  function containsDuplicates(element) {
    let count = segData.filter((item) => item === element).length;
    return count > 1;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? "block" : "hidden"
      }`}
    >
      <div className="bg-gray-800 bg-opacity-75 fixed inset-0 pointer-events-none"></div>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-11/12 max-w-lg mx-auto p-6 relative z-10">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            The Winner is...
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            <span
              className={`font-extrabold ${
                winner
                  ? winner.length > 50
                    ? "text-xl"
                    : "text-2xl"
                  : "text-2xl"
              }`}
              dangerouslySetInnerHTML={{ __html: setImgMaxWidth(winner) }}
            ></span>
          </p>
        </div>
        <div className="flex justify-end space-x-4">
          <Button
            onClick={() => {
              setOpen(!open);
              setShowCelebration(!open);
            }}
            variant={"secondary"}
            className=""
          >
            Close
          </Button>
          <Button
            onClick={() => {
              removeWinner(false);
            }}
            className=""
            variant={"destructive"}
          >
            Remove
          </Button>
          {containsDuplicates(segData[prizeNumber]) && (
            <Button
              onClick={() => {
                removeWinner(true);
              }}
              className=""
              variant={"destructive"}
            >
              Remove All Instances
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WinnerPopup;
