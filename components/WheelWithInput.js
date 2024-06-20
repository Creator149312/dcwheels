"use client";

import { useEffect, useState } from "react";
import InputComponent from "@components/InputComponent";
import WheelComponent from "@components/WheelComponent";
import WinnerPopup from "@components/WinnerPopup";
import { SegmentsProvider } from "@app/SegmentsContext";
import CustomSpinWheel from "@components/CustomSpinWheel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import ResultList from "@components/ResultList";
import { Button } from "@components/ui/button";
import SaveWheelBtn from "@components/SaveWheelBtn";

export default function WheelWithInput() {
  const [result, setResult] = useState("");
  let [winner, setWinner] = useState("");
  const options = ["1", "2", "3", "4", "5", "6"];
  const segColors = [
    "#EE4040",
    "#F0CF50",
    "#815CD1",
    "#3DA5E0",
    "#34A24F",
    "#F9AA1F",
    "#EC3F3F",
    "#FF9000",
  ];

  const onFinished = (winner) => {
    setWinner(winner);
  };

//   console.log("winner is ", winner);
//   console.log("Result Array \n", result);

  useEffect(() => {
    if (winner !== "" && winner !== undefined) {
      if (result.length === 0) setResult((prev) => prev + winner);
      else setResult((prev) => prev + "\n" + winner);
    }
  }, [winner]);

  return (
    <SegmentsProvider>
      <div className="grid md:grid-cols-12 gap-x-2 m-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow md:m-2 mb-2 mt-2 p-2 md:p-5 md:col-span-7">
          <WinnerPopup winner={winner} setWinner={setWinner} />
          <WheelComponent
            segColors={segColors}
            // winningSegment='won 10'
            onFinished={(winner) => onFinished(winner)}
            primaryColor="black"
            contrastColor="white"
            buttonText="Spin"
            isOnlyOnce={false}
            size={250}
            upDuration={100}
            downDuration={1000}
            fontFamily="Arial"
            winner={winner}
            deceleration={0.01}
          />
          {/* <CustomSpinWheel colors={segColors}  setWinner={setWinner}/> */}
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow md:m-2 mb-2 mt-2 md:col-span-5">
          <Tabs defaultValue="list">
            <TabsList className="w-full">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="result">Result</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <InputComponent />
            </TabsContent>
            <TabsContent value="result">
              <ResultList result={result} />
            </TabsContent>
          </Tabs>
        <SaveWheelBtn/>
        </div>
      </div>
    </SegmentsProvider>
  );
}
