"use client";

export default function ReviewRecommendToggle({
  value,
  onChange,
  disabled,
  isLoggedIn = false,      // NEW: login state
  openLoginPrompt,         // NEW: fn to show login modal
}) {
  const handleSelect = (val) => {
    if (!isLoggedIn) {
      openLoginPrompt?.();
      return;
    }
    onChange(val);
  };

  return (
    <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => handleSelect(true)}
        disabled={disabled && isLoggedIn} 
        className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
          value === true
            ? "bg-green-600 text-white"
            : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => handleSelect(false)}
        disabled={disabled && isLoggedIn}
        className={`px-3 py-1.5 text-sm font-semibold border-l border-gray-300 dark:border-gray-700 transition-colors ${
          value === false
            ? "bg-red-600 text-white"
            : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        No
      </button>
    </div>
  );
}
