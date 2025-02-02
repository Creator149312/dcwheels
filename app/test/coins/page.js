'use client'
import { useState } from "react";
import "animate.css";
import { FaCoins, FaSmile, FaFrown } from "react-icons/fa";

export default function CoinTracker() {
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState([]);
  const [characterMood, setCharacterMood] = useState("happy"); // Default mood

  const addCoin = () => {
    const newCoinCount = coins + 1;
    setCoins(newCoinCount);
    setCharacterMood("happy"); // Set character mood to happy
    // Trigger animation
    document.getElementById("character").classList.add("animate__bounceIn");

    // Update level
    const newLevel = Math.floor(newCoinCount / 10) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
    }

    // Check for achievements
    if (newCoinCount === 10) {
      setAchievements([...achievements, "First 10 Coins!"]);
    }
  };

  const useCoin = () => {
    if (coins > 0) {
      const newCoinCount = coins - 1;
      setCoins(newCoinCount);
      setCharacterMood("sad"); // Set character mood to sad
      // Trigger animation
      document.getElementById("character").classList.add("animate__shakeX");
    }
  };

  // Remove animation classes after they finish
  const handleAnimationEnd = (event) => {
    event.target.classList.remove("animate__bounceIn", "animate__shakeX");
  };

  const progressPercentage = (coins % 10) * 10; // Calculate progress percentage

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-green-400 to-blue-500 p-6">
      <h1 className="text-5xl font-extrabold mb-6 text-white drop-shadow-lg">Coin Tracker</h1>
      <div
        id="character"
        className="text-6xl mb-4 animate__animated"
        onAnimationEnd={handleAnimationEnd}
      >
        {characterMood === "happy" ? <FaSmile /> : <FaFrown />}
      </div>
      <div className="text-3xl mb-4 text-white flex items-center" id="coin-display">
        <FaCoins className="mr-2" /> Coins: {coins}
      </div>
      <div className="text-2xl mb-4 text-white">Level: {level}</div>
      <div className="w-full max-w-sm bg-gray-300 rounded-full h-6 mb-6">
        <div className="bg-yellow-500 h-6 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
      </div>
      <div className="space-x-4">
        <button
          onClick={addCoin}
          className="px-4 py-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transform hover:scale-105 transition duration-300"
        >
          Add Coin
        </button>
        <button
          onClick={useCoin}
          className="px-4 py-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transform hover:scale-105 transition duration-300"
        >
          Use Coin
        </button>
      </div>
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-2 text-white">Achievements:</h2>
        <ul className="text-white">
          {achievements.map((achievement, index) => (
            <li key={index} className="text-lg">
              {achievement}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
