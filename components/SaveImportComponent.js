"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import SaveWheelBtn from "./SaveWheelBtn";
import { Button } from "@/components/ui/button";
import { CloudUpload } from "lucide-react";

const SaveImportComponent = ({ onImport, segments }) => {
  const { status, data: session } = useSession();

  return (
    <div className="w-full h-full flex items-center">
      {/* Save Button */}
      {session !== null ? (
        <SaveWheelBtn segmentsData={segments} />
      ) : (
        <Button
          variant="outline"
          className="w-full h-11 sm:h-9 flex items-center justify-center gap-2 text-sm sm:text-xs font-bold rounded-xl sm:rounded-lg shadow-sm touch-manipulation"
          asChild
        >
          <Link href="/login">
            Login to save <CloudUpload size={16} />
          </Link>
        </Button>
      )}
    </div>
  );
};

export default SaveImportComponent;
