"use client";
import { useState } from "react";
import useLists from "@utils/customHooks/UseLists";
import * as XLSX from "xlsx";

const ListSelectorAdv = () => {
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedListTitle, setSelectedListTitle] = useState("");
  const [textareaValue, setTextareaValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  // Handle file upload for .txt or .xlsx files
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (fileExtension === "txt") {
      readTxtFile(file);
    } else if (fileExtension === "xlsx") {
      readXlsxFile(file);
    } else {
      setErrorMessage("Invalid file type. Please upload a .txt or .xlsx file.");
    }
  };

  // Read .txt file and extract words
  const readTxtFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result.split("\n");
      const wordData = content.map((line) => ({
        word: line.trim(),
        wordData: "",
      }));

      // Assuming you want to append the new words to the first list
      const updatedLists = [...lists];
      updatedLists[0].words = [...updatedLists[0].words, ...wordData]; // Add to first list (you can change the logic)
      setTextareaValue(
        wordData.map((item) => `${item.word}: ${item.wordData}`).join("\n")
      );
    };
    reader.onerror = () => {
      setErrorMessage("Error reading .txt file.");
    };
    reader.readAsText(file);
  };

  // Read .xlsx file and extract the first column
  const readXlsxFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const wordData = rows.map((row) => ({ word: row[0], wordData: "" }));

      // Assuming you want to append the new words to the first list
      const updatedLists = [...lists];
      updatedLists[0].words = [...updatedLists[0].words, ...wordData]; // Add to first list (you can change the logic)
      setTextareaValue(
        wordData.map((item) => `${item.word}: ${item.wordData}`).join("\n")
      );
    };
    reader.onerror = () => {
      setErrorMessage("Error reading .xlsx file.");
    };
    reader.readAsArrayBuffer(file);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
        Select a List
      </h1>

      {/* Regular select dropdown */}
      <div className="w-72">
        <select
          value={selectedListId}
          onChange={handleSelectChange}
          className="w-full py-2 px-3 border rounded-lg bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white"
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

      {/* File upload input */}
      <div className="mt-4">
        <input
          type="file"
          accept=".txt,.xlsx"
          onChange={handleFileUpload}
          className="border p-2 rounded-lg bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Error message */}
      {errorMessage && <div className="mt-2 text-red-600">{errorMessage}</div>}

      {/* Textarea to display the words of the selected list */}
      <div className="mt-4">
        <textarea
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
          rows="10"
          className="w-full p-4 border rounded-lg bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white"
          readOnly
        />
      </div>
    </div>
  );
};

export default ListSelectorAdv;
