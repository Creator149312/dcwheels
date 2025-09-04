"use client";
import { useState } from "react";
import Coin from "./Coin";

export default function CoinsManager() {
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
    <div className="flex items-center mb-8">
      <Coin actionType="add" onActionComplete={handleAddCoin} />
      <span className="text-white text-3xl mx-4">Coins: {coins}</span>
    </div>
  );
}
