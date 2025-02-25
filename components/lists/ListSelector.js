"use client";
import { useContext, useState } from "react";
import useLists from "@utils/customHooks/useLists";
import { generateRandomizedMCQsBasic } from "@utils/HelperFunctions";
import { SegmentsContext } from "@app/SegmentsContext";
import { useSession } from "next-auth/react";

const ListSelector = ({ html, setSegData }) => {
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedListTitle, setSelectedListTitle] = useState("");
  const {
    updateSegment,
    segData,
    wheelType,
    setWheelType,
    advancedOptions,
    setadvancedOptions,
  } = useContext(SegmentsContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userChoice, setUserChoice] = useState("");
  const [listData, setListData] = useState({});
  const [selectedType, setSelectedType] = useState("");
  const { status, data: session } = useSession();

  // Using the custom hook to fetch lists
  const { lists, loading, error } = useLists(null, true);

  // Handle select change
  const handleListChange = (e) => {
    const listId = e.target.value;
    setSelectedListId(listId);
    setIsModalOpen(true); // Open the modal when a selection is made

    // Find the selected list and populate words in the textarea
    const selectedList = lists.find((list) => list._id === listId);
    setListData(selectedList);
  };

  // Function to handle user's choice in the modal
  const handleUserChoice = () => {
    setSelectedType(userChoice);
    setWheelType(userChoice);
    loadDataForType(userChoice);
    setIsModalOpen(false); // Close the modal
  };

  // Function to load data based on the selected type
  const loadDataForType = (type) => {
    switch (type) {
      case "basic":
        prepareBasicWheel();
        break;
      case "advanced":
        prepareAdvancedWheel();
        break;
      case "quiz":
        prepareQuizWheel();
        break;
      default:
        setListData([]);
        break;
    }
  };

  const prepareBasicWheel = () => {
    if (listData) {
      const wordsText = listData.words.map((wordData) => {
        return { text: wordData.word };
      });

      setadvancedOptions(false);
      setSelectedListTitle(listData.title);
      setSegData(wordsText);
      html.current = wordsText
        .map((perSegData) => `<div>${perSegData.text}</div>`)
        .join("");
    }
  };

  const prepareAdvancedWheel = () => {
    if (listData) {
      const wordsText = listData.words.map((wordData) => {
        return { text: wordData.word };
      });

      setadvancedOptions(true);
      setSelectedListTitle(listData.title);
      setSegData(wordsText);
      html.current = wordsText
        .map((perSegData) => `<div>${perSegData.text}</div>`)
        .join("");
    }
  };

  const prepareQuizWheel = () => {
    if (listData) {
      const wordsText = listData.words.map((wordData) => {
        return { text: wordData.word };
      });

      setadvancedOptions(false);
      setSelectedListTitle(listData.title);
      setSegData(wordsText);
      html.current = wordsText
        .map((perSegData) => `<div>${perSegData.text}</div>`)
        .join("");

      const questionsForSegments = generateRandomizedMCQsBasic(listData.words);

      for (let i = 0; i < wordsText.length; i++) {
        updateSegment(i, "question", questionsForSegments[i]);
        // updateSegment(i, "learn", listData.words);
        // console.log("Seg Data = ", segData);
      }
    }
  };

  // Function to handle the closing of the modal without making a selection
  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-2">
      {status === "authenticated" && (
        <div className="w-full">
          <select
            value={selectedListId || ""}
            onChange={handleListChange}
            className="w-full py-1 px-3 border rounded-lg bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white"
          >
            <option value="" disabled>
              Select a List to Load
            </option>
            {lists.map((list) => (
              <option key={list._id} value={list._id}>
                {list.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Modal to choose the list type */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full dark:bg-gray-800 dark:text-white">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              What type of Wheel you want to create from this list?
            </h2>
            <select
              value={userChoice}
              onChange={(e) => setUserChoice(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">-- Select a Type --</option>
              <option value="basic">Basic</option>
              {/* <option value="advanced">Advanced</option>*/}
              {/* <option value="quiz">Quiz</option>  */}
            </select>
            <div className="flex justify-between">
              <button
                onClick={handleUserChoice}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Confirm
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListSelector;
