"use client";
import SaveWheelLocally from "./SaveWheelLocally";
import { useSession } from "next-auth/react";
import SaveWheelBtn from "./SaveWheelBtn";
import { Button } from "./ui/button";
import ImportLocalWheel from "./ImportLocalWheel";

const SaveImportComponent = ({ onImport, segments }) => {
  const { status, data: session } = useSession();
  return (
    <div className="flex flex-wrap justify-between items-center gap-x-0.5">
      {/* Save Button */}
      {session !== null ? (
        <>
          <div className="flex flex-wrap">
            {/* Save on Cloud Button */}
            <SaveWheelLocally segmentsData={segments} />
            {/* Save on Cloud Button */}
            <SaveWheelBtn segmentsData={segments} />
            <ImportLocalWheel afterImport={onImport} />
          </div>
        </>
      ) : (
        <>
          <p className="my-2 flex justify-center items-center">
            <a href="/register">
              <Button className="mx-2" size={"lg"} variant={"default"}>
                Register Here
              </Button>
            </a>
            to Save Your Wheels
          </p>
        </>
      )}
    </div>
  );
};

export default SaveImportComponent;
