'use client'
import React, { useContext } from "react";
import { handleAction } from "@utils/HelperFunctions";
import { SegmentsContext } from "@app/SegmentsContext";

const page = () => {
  const {coins, setCoins} = useContext(SegmentsContext);
  return (
    <button
      onClick={(e) =>
        handleAction({
          actionType: "add",
          amount: parseInt(10),
          coins,
          setCoins,
          event: e,
        })
      }
      className="px-4 py-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transform hover:scale-105 transition duration-300 ml-2"
    >
      Add 10 Coins
    </button>
  );
};

export default page;
