"use client";

import { useEffect, useState, useContext } from "react";
import InputComponent from "@components/InputComponent";
import WheelComponent from "@components/WheelComponent";
import WinnerPopup from "@components/WinnerPopup";
import { SegmentsProvider } from "@app/SegmentsContext";
import { SegmentsContext } from "@app/SegmentsContext";
import CustomSpinWheel from "@components/CustomSpinWheel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import ResultList from "@components/ResultList";
import { Button } from "@components/ui/button";
import SaveWheelBtn from "@components/SaveWheelBtn";
import useScreenSize from "@utils/useScreenSize";
import { useSession } from "next-auth/react";

export default function WheelWithInput({ newSegments }) {
  const [result, setResult] = useState("");
  let [winner, setWinner] = useState("");
  const { segments, setSegments } = useContext(SegmentsContext);
  const { setUserInputText } = useContext(SegmentsContext);
  const { width, height } = useScreenSize();
  const { status, data: session } = useSession();
  console.log("New Segments, ", newSegments);

  let wheelSize = Math.min(width, height) * 0.39;
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

  useEffect(() => {
    setSegments(newSegments);
    setUserInputText(newSegments.join("\n"));
  }, []);

  useEffect(() => {
    if (winner !== "" && winner !== undefined) {
      if (result.length === 0) setResult((prev) => prev + winner);
      else setResult((prev) => prev + "\n" + winner);
    }
  }, [winner]);

  return (
    <div className="grid md:grid-cols-12 gap-x-2 m-2 mt-0">
      <div className="bg-card text-card-foreground md:m-2 mb-2 mt-0 p-2 pt-0 md:col-span-8">
        <WinnerPopup winner={winner} setWinner={setWinner} />
        <WheelComponent
          segColors={segColors}
          // winningSegment='won 10'
          onFinished={(winner) => onFinished(winner)}
          primaryColor="black"
          contrastColor="white"
          buttonText="Spin"
          isOnlyOnce={false}
          size={wheelSize}
          upDuration={100}
          downDuration={1000}
          fontFamily="Arial"
          winner={winner}
          deceleration={0.01}
        />
      </div>
      <div className="bg-card text-card-foreground md:m-2 mb-2 mt-2 md:col-span-4">
        <Tabs defaultValue="list">
          <TabsList className="w-full">
            <TabsTrigger value="list">
              List <span className="ml-2">{segments.length}</span>
            </TabsTrigger>
            <TabsTrigger value="result">
              Result <span className="ml-2">{result.length === 0 ? 0 : result.split("\n").length}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <InputComponent />
          </TabsContent>
          <TabsContent value="result">
            <ResultList result={result} />
          </TabsContent>
        </Tabs>
        {session !== null && <SaveWheelBtn /> }
      </div>
    </div>
  );
}
