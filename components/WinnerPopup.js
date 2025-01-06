"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { useEffect, useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";

const WinnerPopup = ({
  winner,
  setWinner,
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

  const removeWinner = () => {
    let updatedSegData = segData.filter((element) => element !== winner); // Filter out element with value 3
    setSegData(updatedSegData);

    html.current = updatedSegData
      .map((perSegData) => `<div>${perSegData}</div>`)
      .join("");
    setOpen(!open);
    setShowCelebration(!open);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>The Winner is...</AlertDialogTitle>
          <AlertDialogDescription>
            <span
             className={`font-extrabold ${winner ? (winner.length > 50 ? 'text-xl' : 'text-2xl') : 'text-2xl'}`}
              dangerouslySetInnerHTML={{ __html: winner }}
            ></span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setOpen(!open);
              setShowCelebration(!open);
            }}
          >
            Close
          </AlertDialogCancel>
          <AlertDialogAction onClick={removeWinner}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WinnerPopup;
