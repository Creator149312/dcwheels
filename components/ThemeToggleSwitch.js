import { HiMoon } from "@node_modules/react-icons/hi";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggleSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  // Sync toggle with system/theme state
  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const handleToggle = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    setIsDark(!isDark);
  };

  return (
    <label className="flex items-center justify-between w-full cursor-pointer text-sm">
      <div className="flex justify-start">
        <HiMoon className="mr-2"  size={20} />
        <span>Dark Mode</span>
      </div>
      <input
        type="checkbox"
        checked={isDark}
        onChange={handleToggle}
        className="toggle-checkbox hidden"
      />
      <div className="w-8 h-4 bg-gray-300 rounded-full relative transition-colors duration-300 dark:bg-gray-600">
        <div
          className={`absolute left-0 top-0 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
            isDark ? "translate-x-5" : ""
          }`}
        />
      </div>
    </label>
  );
}
