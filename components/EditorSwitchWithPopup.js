"use client";
import { useState } from "react";
import { FaPencilRuler } from "react-icons/fa";

const EditorSwitchWithPopup = ({ advOpt, setAdvOpt }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxClick = (event) => {
    event.preventDefault(); // Prevent checkbox from being checked/unchecked immediately
    setIsModalOpen(true);
  };

  const handleOkClick = () => {
    setIsChecked(true);
    setIsModalOpen(false);
    setAdvOpt(!advOpt);
  };

  const handleCancelClick = () => {
    setIsChecked(false);
    setIsModalOpen(false);
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="advanced-options"
          checked={advOpt}
          onChange={handleCheckboxClick}
          className="mr-2"
        />
        <label htmlFor="advanced-options" className="text-sm">
          Advanced Editor <FaPencilRuler size={20} className="ml-1 inline" />
        </label>
      </div>

      {/* Popup Modal */}
      {isModalOpen && (
       <div className="z-10 fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
       <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 shadow-lg w-full max-w-md mx-4">
         <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
           {advOpt ? "Revert from Advanced Editor" : "Switch to Advanced Editor"}
         </h2>
         <p className="text-gray-700 dark:text-gray-300">
           {advOpt
             ? "If you revert from advanced editor, you may lose some colors, images, and weights. Are you sure you want to continue?"
             : 'Advanced editor provides more customization, but you cannot paste in several entries at once. You can always switch back by unchecking the "Advanced Editor" checkbox. Are you sure you want to switch to advanced editor?'}
         </p>
         <div className="flex justify-end space-x-4">
           <button
             onClick={handleCancelClick}
             className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
           >
             Cancel
           </button>
           <button
             onClick={handleOkClick}
             className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800"
           >
             OK
           </button>
         </div>
       </div>
     </div>
     
      )}
    </div>
  );
};

export default EditorSwitchWithPopup;
