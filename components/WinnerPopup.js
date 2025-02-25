"use client";
import { useEffect, useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "./ui/button";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import MCQQuestion from "@app/test/questions/MCQQuestion";

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
    if (!mustSpin) {
      const timeoutId = setTimeout(() => {
        if (winner !== "" && winner !== undefined) {
          setOpen(true);
          if (wheelData.removeWinnerAfterSpin) {
            removeWinner(false);
          }
          setShowCelebration(true);
        } else {
          setOpen(false);
          setShowCelebration(false);
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [winner, mustSpin]);

  const removeWinner = (ifRemoveAll) => {
    let updatedSegData = null;
    if (ifRemoveAll) {
      updatedSegData = segData.filter(
        (element) => element.text !== winner.text
      );
    } else {
      updatedSegData = segData.filter(
        (element, index) =>
          !(element.text === winner.text && index === prizeNumber)
      );
    }

    // console.log("Updated Seg Data = ", updatedSegData);
    setSegData(updatedSegData);

    // html.current = updatedSegData
    //   .map((perSegData) => `<div>${perSegData.text}</div>`)
    //   .join("");

    html.current = segmentsToHTMLTxt(updatedSegData);
    setOpen(!open);
    setShowCelebration(!open);
  };

  const setImgMaxWidth = (temphtml) => {
    if (typeof document !== "undefined" && temphtml) {
      const div = document.createElement("div");
      div.innerHTML = temphtml.text;

      // if (advancedOptions) {
      //   console.log("Inside advOption ");
      //   let j = 0;
      //   for (let i = 0; i < segData.length; i++) {
      //     if (segData[i].visible) {
      //       if (j === prizeNumber) {
      //         div.innerHTML = segData[i].text;
      //         break;
      //       } else j++;
      //     }
      //   }
      // }
      // console.log(
      //   "Temp HTML = " + temphtml.text + " Div INNER = " + div.innerHTML
      // );
      // console.log("Div = ", div);
      const imgs = div.getElementsByTagName("img");

      Array.from(imgs).forEach((img) => {
        if (img) {
          img.style.width = "100px";
        }
      });
      return div.innerHTML;
    } else {
      return temphtml;
    }
  };

  function containsDuplicates(element) {
    if (element !== undefined) {
      let count = segData.filter((item) => item.text === element.text).length;
      return count > 1;
    } else {
      return 0;
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? "block" : "hidden"
      }`}
    >
      <div className="bg-gray-800 bg-opacity-20 fixed inset-0 pointer-events-none"></div>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-11/12 max-w-lg mx-auto p-6 relative z-10">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {wheelData.customPopupDisplayMessage}
          </h2>
          {/*           
          <p className="text-gray-700 dark:text-gray-300">
            <span
              className={`font-extrabold ${
                winner
                  ? winner.text.length > 50
                    ? "text-xl"
                    : "text-2xl"
                  : "text-2xl"
              }`}
              dangerouslySetInnerHTML={{ __html: setImgMaxWidth(winner) }}
            ></span>
          </p> */}
          <div>
            {wheelType === "quiz" && winner?.question ? (
              // <TrueOrFalseQuestion questionData={winner.question}/>
              <MCQQuestion questionData={winner?.question} />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                <span
                  className={`font-extrabold ${
                    winner
                      ? winner.text.length > 50
                        ? "text-xl"
                        : "text-2xl"
                      : "text-2xl"
                  }`}
                  dangerouslySetInnerHTML={{ __html: setImgMaxWidth(winner) }}
                ></span>
              </p>
            )}
          </div>
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
          {wheelType !== "quiz" && !wheelData.removeWinnerAfterSpin && (
            <>
              <Button
                onClick={() => {
                  removeWinner(false);
                }}
                className=""
                variant={"destructive"}
              >
                Remove
              </Button>
              {containsDuplicates(segData[prizeNumber]) > 0 && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WinnerPopup;
