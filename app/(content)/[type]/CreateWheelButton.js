"use client";
import { useRouter } from "next/navigation";

export default function CreateWheelButton({ type, contentId }) {
  const router = useRouter();

  const handleCreateWheelClick = () => {
    if (!contentId || !type) return;
    router.push(`/?type=${type}&id=${contentId}`);
  };

  return (
    <button
      onClick={handleCreateWheelClick}
      title={`Create a picker wheel for this ${type}`}
      className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 shadow-sm"
    >
      🎡 Create Wheel
    </button>
  );
}
