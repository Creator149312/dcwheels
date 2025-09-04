// components/ChestBox.js
import { useState } from 'react';

const ChestBox = ({ onActionComplete }) => {
  const [animationClass, setAnimationClass] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Handle Open Chest Animation (Shake + Open)
  const handleOpenChestBox = () => {
    setAnimationClass('chest-shake');
    setIsOpen(false);  // Ensure the chest is initially closed
    // Shake the chest for 3 seconds
    setTimeout(() => {
      setAnimationClass('chest-open');
      setIsOpen(true);  // After shaking, open the chest
      // Trigger onActionComplete after animation finishes
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1000);  // Wait for the chest opening animation to finish
    }, 3000);  // Shake for 3 seconds
  };

  return (
    <>
      {/* Inline CSS */}
      <style jsx>{`
        @keyframes chestShake {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(15deg);
          }
          50% {
            transform: rotate(0deg);
          }
          75% {
            transform: rotate(-15deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes chestOpen {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(45deg);
          }
        }

        .chest-shake {
          animation: chestShake 3s ease-in-out forwards;
        }

        .chest-open {
          animation: chestOpen 1s ease-in-out forwards;
        }
      `}</style>

      <div
        onClick={handleOpenChestBox}
        className={`cursor-pointer ${animationClass} transition-all duration-500`}
        aria-label="chest-box"
      >
        <span role="img" aria-label="chest" className="block text-4xl">
          {isOpen ? "🪙" : "🗝️"} {/* Show coin when chest is open */}
        </span>
      </div>
    </>
  );
};

export default ChestBox;
