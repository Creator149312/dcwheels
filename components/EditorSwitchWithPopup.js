"use client";
import { FaPencilRuler } from "react-icons/fa";

const EditorSwitchWithPopup = ({ advOpt, setAdvOpt }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="advanced-options"
          checked={advOpt}
          onChange={(e) => setAdvOpt(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="advanced-options" className="text-sm">
          Advanced Mode <FaPencilRuler size={16} className="ml-1 inline" />
        </label>
      </div>
    </div>
  );
};

export default EditorSwitchWithPopup;
