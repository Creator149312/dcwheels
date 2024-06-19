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
} from "@/components/ui/alert-dialog";
import { useEffect, useState, useContext } from "react";
import { SegmentsContext } from "@/app/SegmentsContext";

const WinnerPopup = ({ winner, setWinner }) => {
  let [open, setOpen] = useState(false);
  const { segments, setSegments } = useContext(SegmentsContext);
  const { userInputText, setUserInputText } = useContext(SegmentsContext);

  useEffect(() => {
    if (winner !== "" && winner !== undefined) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [winner]);

  function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  function joinWithNewlines(stringArray) {
    // Handle empty array case
    if (!stringArray) {
      return "";
    }

    // Join all elements except the last with newlines
    const joinedWithNewlines = stringArray.slice(0, -1).join("\n");

    // Concatenate with the last element and another newline
    return joinedWithNewlines + "\n" + stringArray[stringArray.length - 1];
  }

  const removeWinner = () => {
    let updatedArray = segments.filter((element) => element !== winner); // Filter out element with value 3
    setUserInputText(joinWithNewlines(updatedArray));
    // console.log("Updated Segments after Removing Winner", updatedArray);
    setOpen(!open);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>The Winner is...</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-bold font-large">{winner}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              const duplicateOfSegments = [...segments];
              setOpen(!open);
              setWinner("");
              setUserInputText(joinWithNewlines(duplicateOfSegments));
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
