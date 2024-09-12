"use client";

import { useEffect, useState, useContext } from "react";
import InputComponent from "@components/InputComponent";
import WheelComponent from "@components/WheelComponent";
import WinnerPopup from "@components/WinnerPopup";
import { SegmentsProvider } from "@app/SegmentsContext";
import { SegmentsContext } from "@app/SegmentsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import ResultList from "@components/ResultList";
import SaveWheelBtn from "@components/SaveWheelBtn";
import useScreenSize from "@utils/useScreenSize";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import FireworksConfetti from "./FireworksConfetti";

export default function WheelWithInput({ newSegments }) {
  const [result, setResult] = useState("");
  const [winner, setWinner] = useState("");
  const { segments, setSegments } = useContext(SegmentsContext);
  const { setUserInputText } = useContext(SegmentsContext);
  const { status, data: session } = useSession();
  const { width, height } = useScreenSize();

  let wheelSize = Math.min(Math.min(width, height) * 0.41, 250);
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

  useEffect(() => {
    setSegments(segments);
    setUserInputText(segments.join("\n"));
  }, [width]);

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
    <div className="grid lg:grid-cols-12 gap-x-2">
      <div className="bg-card text-card-foreground lg:mb-2 pt-0 lg:col-span-8 mx-auto">
        <WinnerPopup winner={winner} setWinner={setWinner} />
        <WheelComponent
          segColors={segColors}
          // winningSegment='won 10'
          onFinished={(winner) => setWinner(winner)}
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
{/*         
        <div className="bg-slate-300 min-h-22"> For Advertisement </div> */}
      </div>
      <div className="bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:my-2 lg:col-span-4">
        <Tabs defaultValue="list">
          <TabsList className="w-full">
            <TabsTrigger value="list">
              List <span className="ml-2">{segments.length}</span>
            </TabsTrigger>
            <TabsTrigger value="result">
              Result
              <span className="ml-2">
                {result.length === 0 ? 0 : result.split("\n").length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <InputComponent />
          </TabsContent>
          <TabsContent value="result">
            <ResultList result={result} />
          </TabsContent>
        </Tabs>
        <div >
        {session !== null ? <SaveWheelBtn /> : <p className="my-2 flex justify-center items-center"><a href="/register"><Button className="mx-2" size={"lg"} variant={"default"}>Register Here</Button> </a> to Save Your Wheels</p>}
        </div>
      </div>
      { winner && <FireworksConfetti />}
    </div>
  );
}
