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
      className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors duration-200 shadow-sm"
    >
      🎡 Create Wheel
    </button>
  );
}
