'use client'
import { useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai'; // Import the Close icon from react-icons

const ToggleFullScreen = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Function to handle toggling full screen mode
  const handleToggle = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Function to handle canceling full screen mode
  const handleCancel = () => {
    setIsFullScreen(false);
  };

  return (
    <div className="relative h-screen w-screen bg-gray-200 dark:bg-gray-900">
      {/* Button to toggle full screen mode */}
      <button
        onClick={handleToggle}
        className="absolute top-4 left-4 bg-blue-500 text-white p-3 rounded-md shadow-lg hover:bg-blue-600 focus:outline-none transition"
      >
        {isFullScreen ? 'Exit Full Screen' : 'Go Full Screen'}
      </button>

      {/* Full screen content div */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isFullScreen
            ? 'absolute top-0 left-0 w-screen h-screen bg-blue-300 dark:bg-blue-700 flex flex-col justify-center items-center'
            : 'p-8'
        }`}
      >
        {isFullScreen && (
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 text-white text-3xl bg-transparent hover:bg-gray-800 rounded-full p-2 focus:outline-none"
          >
            <AiOutlineClose />
          </button>
        )}

        <h1 className="text-3xl font-semibold text-center text-gray-800 dark:text-white">
          {isFullScreen ? 'Full Screen Mode' : 'Normal Mode'}
        </h1>
        <p className="text-center text-gray-700 dark:text-gray-300">
          {isFullScreen
            ? 'You are now in full screen mode. Click the cross to exit.'
            : 'Click the button to toggle full screen mode.'}
        </p>
      </div>
    </div>
  );
};

export default ToggleFullScreen;
