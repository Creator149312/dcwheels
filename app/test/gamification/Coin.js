// components/Coin.js
import { useState } from 'react';

const Coin = ({ actionType, onActionComplete }) => {
  const [animationClass, setAnimationClass] = useState('');
  const [size, setSize] = useState('text-4xl');

  // Handle Add Coin Animation (Enlarge & Spin)
  const handleAddCoin = () => {
    setAnimationClass('coin-add');
    setSize('text-5xl');  // Enlarge the coin size
    // Trigger onActionComplete after animation finishes
    setTimeout(() => {
      setAnimationClass('');
      setSize('text-4xl');
      if (onActionComplete) onActionComplete();
    }, 1000);
  };

  // Handle Use Coin Animation (Shrink & Shake)
  const handleUseCoin = () => {
    setAnimationClass('coin-use');
    setSize('text-2xl');  // Shrink the coin size
    // Trigger onActionComplete after animation finishes
    setTimeout(() => {
      setAnimationClass('');
      setSize('text-4xl');
      if (onActionComplete) onActionComplete();
    }, 500);
  };

  // Trigger the correct animation based on the actionType prop
  const handleCoinClick = () => {
    if (actionType === 'add') {
      handleAddCoin();
    } else if (actionType === 'use') {
      handleUseCoin();
    }
  };

  return (
    <>
      {/* Inline CSS */}
      <style jsx>{`
        @keyframes coinAdd {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.5) rotate(360deg);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes coinUse {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(0.75);
          }
          50% {
            transform: scale(1);
          }
          75% {
            transform: scale(0.75);
          }
          100% {
            transform: scale(1);
          }
        }

        .coin-add {
          animation: coinAdd 1s ease-in-out forwards;
        }

        .coin-use {
          animation: coinUse 0.5s ease-in-out forwards;
        }
      `}</style>

      <div
        onClick={handleCoinClick}
        className={`cursor-pointer ${size} ${animationClass} transition-all duration-500`}
        aria-label="coin"
      >
        <span role="img" aria-label="coin" className="block">
          🪙
        </span>
      </div>
    </>
  );
};

export default Coin;
