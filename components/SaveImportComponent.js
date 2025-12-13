"use client";
import SaveWheelLocally from "./SaveWheelLocally";
import { useSession } from "next-auth/react";
import SaveWheelBtn from "./SaveWheelBtn";
import ImportLocalWheel from "./ImportLocalWheel";

const SaveImportComponent = ({ onImport, segments }) => {
  const { status, data: session } = useSession();

  return (
    <div className="flex flex-wrap justify-between items-center">
      {/* Save Button */}
      {session !== null ? (
        <>
          <div className="flex flex-wrap">
            {/* Save on Cloud Button */}
            {/* <SaveWheelLocally segmentsData={segments} /> */}
            {/* Save on Cloud Button */}
            
            <SaveWheelBtn segmentsData={segments} />
            {/* <ImportLocalWheel afterImport={onImport} /> */}
          </div>
        </>
      ) : (
        <>
          <p className="my-2 flex justify-center items-center">
            <a href="/login" className="underline mx-2">
              Login
            </a>
            to save your wheels
          </p>
        </>
      )}
    </div>
  );
};

export default SaveImportComponent;
