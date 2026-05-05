"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import SaveWheelBtn from "./SaveWheelBtn";

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
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Link href="/login" className="underline text-blue-500 hover:text-blue-600">
            Login
          </Link>
          to save
        </p>
      )}
    </div>
  );
};

export default SaveImportComponent;
