'use client'
import { useState } from "react";

const Learn = ({
  flashcards = [
    {
      word: "brown",
      wordData: "Details for brown",
      _id: "679fdfd2c8dd0e17cb3649c3",
    },

    { word: "is", wordData: "Details for is", _id: "679fdfd2c8dd0e17cb3649c4" },

    {
      word: "the",
      wordData: "Details for the",
      _id: "679fdfd2c8dd0e17cb3649c5",
    },

    {
      word: "list",
      wordData: "Details for list",
      _id: "679fdfd2c8dd0e17cb3649c6",
    },

    { word: "to", wordData: "Details for to", _id: "679fdfd2c8dd0e17cb3649c7" },
    {
      word: "have",
      wordData: "Details for have",
      _id: "679fdfd2c8dd0e17cb3649c8",
    },
    {
      word: "online",
      wordData: "Details for online",
      _id: "679fdfd2c8dd0e17cb3649c9",
    },
  ],
}) => {
  const [flipped, setFlipped] = useState({});

  const toggleFlip = (index) => {
    setFlipped((prevState) => ({
      ...prevState,
      [index]: !prevState[index], // Toggle the flip status
    }));
  };

  return (<></>
    // <div className="flashcards-container">
    //   {flashcards.map((card, index) => (
    //     <div
    //       key={index}
    //       className={`flashcard ${flipped[index] ? "flipped" : ""}`}
    //       onClick={() => toggleFlip(index)}
    //     >
    //       <div className="front">{card.word}</div>
    //       <div className="back">{card.wordData}</div>
    //     </div>
    //   ))}
    //   <style jsx>{`
    //     .flashcards-container {
    //       display: flex;
    //       flex-wrap: wrap;
    //       gap: 16px;
    //       justify-content: center;
    //     }

    //     .flashcard {
    //       width: 200px;
    //       height: 250px;
    //       perspective: 1000px;
    //       cursor: pointer;
    //     }

    //     .flashcard .front,
    //     .flashcard .back {
    //       width: 100%;
    //       height: 100%;
    //       position: absolute;
    //       backface-visibility: hidden;
    //       display: flex;
    //       justify-content: center;
    //       align-items: center;
    //       font-size: 20px;
    //       font-weight: bold;
    //       padding: 16px;
    //       text-align: center;
    //       border: 1px solid #ccc;
    //       border-radius: 10px;
    //     }

    //     .flashcard .front {
    //       background-color: #f7f7f7;
    //     }

    //     .flashcard .back {
    //       background-color: #4caf50;
    //       color: white;
    //       transform: rotateY(180deg);
    //     }

    //     .flashcard.flipped .front {
    //       transform: rotateY(180deg);
    //     }

    //     .flashcard.flipped .back {
    //       transform: rotateY(0deg);
    //     }
    //   `}</style>
    // </div>
  );
};

export default Learn;
