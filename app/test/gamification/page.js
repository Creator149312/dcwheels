'use client'
import { useState } from 'react';
import Coin from './Coin';
import ChestBox from './ChestBox';

export default function Home() {
  const [coins, setCoins] = useState(0);

  // Handle Add Coin Action
  const handleAddCoin = () => {
    setCoins(coins + 1); // Increase coin count
  };

  // Handle Chest Box Action
  const handleChestBoxAction = () => {
    setCoins(coins + 1); // Add a coin when the chest is opened
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      {/* <h1 className="text-white text-4xl font-bold mb-6">Coin Tracker</h1>

      <div className="flex items-center mb-8">
        <Coin actionType="add" onActionComplete={handleAddCoin} />
        <span className="text-white text-3xl mx-4">Coins: {coins}</span>
        <ChestBox onActionComplete={handleChestBoxAction} />
      </div>

      <div className="text-white text-2xl">
        <p>Click the chest to open it and get a coin!</p>
      </div> */}
    </div>
  );
}
