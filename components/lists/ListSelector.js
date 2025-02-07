"use client";
import { useContext, useState } from "react";
import useLists from "@utils/customHooks/useLists";
import { generateRandomizedTrueOrFalseQuestionsBasic } from "@utils/HelperFunctions";
import { SegmentsContext } from "@app/SegmentsContext";

const ListSelector = ({ html, setSegData }) => {
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedListTitle, setSelectedListTitle] = useState("");
  const { updateSegment, segData } = useContext(SegmentsContext);

  // Using the custom hook to fetch lists
  const { lists, loading, error } = useLists();

  // Handle select change
  const handleSelectChange = (e) => {
    const listId = e.target.value;
    setSelectedListId(listId);

    // Find the selected list and populate words in the textarea
    const selectedList = lists.find((list) => list._id === listId);
    if (selectedList) {
      const wordsText = selectedList.words
        .map((wordData) => `${wordData.word}: ${wordData.wordData}`)
        .join("\n");
      setSelectedListTitle(selectedList.title);
      setTextareaValue(wordsText);
    }
  };

  // Handle select change
  const handleListChange = (e) => {
    const listId = e.target.value;
    setSelectedListId(listId);

    // Find the selected list and populate words in the textarea
    const selectedList = lists.find((list) => list._id === listId);
    if (selectedList) {
      const wordsText = selectedList.words.map((wordData) => {
        return { text: wordData.word };
      });

      setSelectedListTitle(selectedList.title);
      setSegData(wordsText);
      html.current = wordsText
        .map((perSegData) => `<div>${perSegData.text}</div>`)
        .join("");

      const questionsForSegments = generateRandomizedTrueOrFalseQuestionsBasic(
        selectedList.words
      );
      for (let i = 0; i < wordsText.length; i++) {
        updateSegment(i, "question", questionsForSegments[i]);
        console.log("Ques = ", questionsForSegments[i]);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-2">
      <div className="w-full">
        <select
          value={selectedListId}
          onChange={handleListChange}
          className="w-full py-1 px-3 border rounded-lg bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white"
        >
          <option value="" disabled>
            Select a list
          </option>
          {lists.map((list) => (
            <option key={list._id} value={list._id}>
              {list.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ListSelector;
