import React from 'react';

const Header = ({ level, totalCoins, streak }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <span className="font-bold text-xl">Level {level}</span>
      </div>
      <div>
        <span className="mr-2">Coins: {totalCoins}</span>
        <span className="font-semibold">Streak: {streak}</span>
      </div>
    </div>
  );
};

export default Header;