"use client";
import { useState, useRef, useContext } from "react";
import "animate.css";
import { FaCoins, FaSmile, FaFrown, FaWallet } from "react-icons/fa";
import { SegmentsContext } from "@app/SegmentsContext";

export default function CoinTrackerAdvanced() {
  const { coins, setCoins } = useContext(SegmentsContext);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState([]);
  const [characterMood, setCharacterMood] = useState("happy");
  const coinContainerRef = useRef(null);
  const [addCoinInput, setAddCoinInput] = useState(1);
  const [useCoinInput, setUseCoinInput] = useState(1);

  const createCoinElements = (count) => {
    const coins = [];
    for (let i = 0; i < count; i++) {
      const coin = document.createElement("div");
      coin.classList.add("coin");
      coin.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="gold" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>`;
      coinContainerRef.current.appendChild(coin);
      coins.push(coin);
    }
    return coins;
  };

  const animateCoins = (coins, from, to) => {
    coins.forEach((coin, index) => {
      const startX = from.x;
      const startY = from.y;
      const endX = to.x;
      const endY = to.y;

      coin.style.position = "absolute";
      coin.style.left = `${startX}px`;
      coin.style.top = `${startY}px`;
      coin.style.transition = "all 0.5s ease-in-out";

      setTimeout(() => {
        coin.style.left = `${endX}px`;
        coin.style.top = `${endY}px`;
      }, 10 * index);

      setTimeout(() => {
        coinContainerRef.current.removeChild(coin);
      }, 300);
    });
  };

  // Updated the addCoin method to directly use the input
  const addCoin = (event) => {
    const numCoinsToAdd = parseInt(addCoinInput, 10);
    if (isNaN(numCoinsToAdd) || numCoinsToAdd < 1) {
      alert("Please enter a valid number of coins to add.");
      return;
    }

    const newCoinCount = coins + numCoinsToAdd;
    setCoins(newCoinCount);
    setCharacterMood("happy");
    document.getElementById("character").classList.add("animate__bounceIn");

    const coinElements = createCoinElements(numCoinsToAdd);
    const clickX = event.clientX;
    const clickY = event.clientY;
    const from = { x: window.innerWidth - 50, y: 50 };
    const to = { x: clickX, y: clickY };
    animateCoins(coinElements, from, to);

    const newLevel = Math.floor(newCoinCount / 10) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
    }

    if (newCoinCount >= 10 && achievements.indexOf("First 10 Coins!") === -1) {
      setAchievements([...achievements, "First 10 Coins!"]);
    }
  };

  // Updated the useCoin method to directly use the input
  const removeCoin = (event) => {
    const numCoinsToUse = parseInt(useCoinInput, 10);
    if (isNaN(numCoinsToUse) || numCoinsToUse < 1 || numCoinsToUse > coins) {
      alert("Please enter a valid number of coins to use.");
      return;
    }

    if (coins >= numCoinsToUse) {
      const newCoinCount = coins - numCoinsToUse;
      setCoins(newCoinCount);
      setCharacterMood("sad");
      document.getElementById("character").classList.add("animate__shakeX");

      const coinElements = createCoinElements(numCoinsToUse);
      const clickX = event.clientX;
      const clickY = event.clientY;
      const from = { x: clickX, y: clickY };
      const to = { x: window.innerWidth - 50, y: 50 };
      animateCoins(coinElements, from, to);
    } else {
      alert("Not enough coins to use.");
      return;
    }
  };

  // The updateCoins function now uses the defined addCoin and useCoin methods.
  const updateCoins = (amount, type, event) => {
    const numCoins = parseInt(type === "add" ? addCoinInput : useCoinInput, 10);

    if (
      isNaN(numCoins) ||
      numCoins < 1 ||
      (type === "use" && numCoins > coins)
    ) {
      alert(
        `Please enter a valid number of coins to ${
          type === "add" ? "add" : "use"
        }.`
      );
      return false; // Indicate failure
    }

    for (let i = 0; i < amount; i++) {
      if (type === "add") {
        addCoin(event);
      } else if (type === "use") {
        removeCoin(event);
      }
    }

    return true; // Indicate success
  };

  const handleAction = (action, event) => {
    let success = false;
    switch (action.type) {
      case "use":
        success = updateCoins(action.amount, "use", event);
        break;
      case "add":
        success = updateCoins(action.amount, "add", event);
        break;
      default:
        console.warn("Unknown action type:", action.type);
    }

    if (success && action.callback) {
      action.callback();
    }
  };

  const handleAnimationEnd = (event) => {
    event.target.classList.remove("animate__bounceIn", "animate__shakeX");
  };

  const progressPercentage = (coins % 10) * 10;
  const actions = [
    {
      label: "Use Advanced Options",
      type: "use",
      amount: 5,
      callback: () => console.log("Advanced options used!"),
    },
    {
      label: "Share",
      type: "add",
      amount: 5,
      callback: () => console.log("Shared!"),
    },
    {
      label: "Invite",
      type: "add",
      amount: 10,
      callback: () => console.log("Invited!"),
    },
    {
      label: "Extra Coins",
      type: "add",
      amount: 2,
      callback: () => console.log("Extra coins!"),
    },
    {
      label: "Penalty",
      type: "use",
      amount: 3,
      callback: () => console.log("Penalty applied!"),
    },
    {
      label: "Big Win",
      type: "add",
      amount: 20,
      callback: () => console.log("Big Win!"),
    },
    {
      label: "Small Loss",
      type: "use",
      amount: 1,
      callback: () => console.log("Small Loss!"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div
        ref={coinContainerRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-50"
      ></div>
      <h1 className="text-5xl font-extrabold mb-6 text-white drop-shadow-lg">
        Coin Tracker
      </h1>
      <div
        id="character"
        className="text-6xl mb-4 animate__animated text-white"
        onAnimationEnd={handleAnimationEnd}
      >
        {characterMood === "happy" ? <FaSmile /> : <FaFrown />}
      </div>
      <div
        className="text-3xl mb-4 text-white flex items-center"
        id="coin-display"
      >
        <FaCoins className="mr-2" /> Coins: {coins}
      </div>
      <div className="text-2xl mb-4 text-white">Level: {level}</div>
      <div className="w-full max-w-sm bg-gray-800 rounded-full h-6 mb-6">
        <div
          className="bg-yellow-500 h-6 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      <div className="flex space-x-4 mb-4">
        {" "}
        {/* Input fields for add/use */}
        <div>
          <input
            type="number"
            value={addCoinInput}
            onChange={(e) => setAddCoinInput(e.target.value)}
            min="1"
            className="border rounded px-2 py-1 bg-gray-700 text-white"
          />
          <button
            onClick={(e) =>
              handleAction(
                {
                  type: "add",
                  amount: parseInt(addCoinInput),
                  callback: () => {},
                },
                e
              )
            } // Directly use handleAction
            className="px-4 py-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transform hover:scale-105 transition duration-300 ml-2"
          >
            Add Coins
          </button>
        </div>
        <div>
          <input
            type="number"
            value={useCoinInput}
            onChange={(e) => setUseCoinInput(e.target.value)}
            min="1"
            className="border rounded px-2 py-1 bg-gray-700 text-white"
          />
          <button
            onClick={(e) =>
              handleAction(
                {
                  type: "use",
                  amount: parseInt(useCoinInput),
                  callback: () => {},
                },
                e
              )
            } // Directly use handleAction
            className="px-4 py-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transform hover:scale-105 transition duration-300 ml-2"
          >
            Use Coins
          </button>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        {/* Action buttons */}
        {actions.map((action, index) => (
          <div key={index} className="flex items-center">
            <button
              onClick={(e) => handleAction(action, e)}
              className={`px-4 py-2 rounded-full shadow-md  ${
                action.type === "add"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              } transform hover:scale-105 transition duration-300`}
            >
              {action.label} ({action.amount} Coins)
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-4xl text-white">
        <FaWallet /> Wallet: {coins}
      </div>
      <div className="mt-6 text-white">
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
