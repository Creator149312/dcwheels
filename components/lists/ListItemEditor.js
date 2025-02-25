"use client";
import { Button } from "@components/ui/button";
import React, { useState } from "react";

const defaultImg =
  "data:image/webp;base64,UklGRtQBAABXRUJQVlA4IMgBAABQHACdASoVAQcBPpFIoEulpKMhpFJYALASCWlu4XShG/ObDXBJx5cGoAg9YFlA1AEHrAsoGoAg9YFlA1AEHrAsjDK771mZs/56wLKBqADX+f89YFlA1ABr/P+esCygagA1/n/PWBZPamyNGSStwQjyjiHvIpDwVSSIW8WUFGhcsjESdo3mzxTeXDSgmbVzAcqXL2FYugrcSJStWyT2f9EA5QNQBB6wK8bgcoGoAg9YFeNnt0OKoAg9YFlAkI7cxFOf89YFlA1ABS1QQB6utGWUDUAQesCygagCD1gWUDUAQesCygagCD1gWT2AAP7/MEAAj8NalbxsfPN/2EynOfucrBoJ0ozmztUMnzJxMX6/9/vGLvPBJi4EBV3/DAKAQvXsd1zN/eS8npnUH3HjmNQzGmS0IuNxKf29v35Ze8MElCB4vUaRvTB4yAaNlSrw8q6FtQu7g2+1aTCjR5/p/wSHMqTW7N70MUpubn6r+SAWrXXjeaziPdNT/ifeEaR574Pz6Jvv2HDG9Njn11CJOfCJALZul0OfsmqAzFJpu/QAH4GmnJap5HwlyuuhazAZPE1gVSQteqfkBfxV4NexMjyy1sH5kgAAAAA=";

const ListItemEditor = ({
  currentTitle,
  currentDescription,
  currentData,
  listID,
}) => {
  const [characters, setCharacters] = useState(currentData);
  const [showAddWordForm, setShowAddWordForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newWordData, setNewWordData] = useState("");
  const [wordDataType, setWordDataType] = useState("text");
  const [imagePreview, setImagePreview] = useState("");
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription);
  const [error, setError] = useState("");

  const validateWord = (word) => {
    if (word.length > 50) return "Word cannot exceed 50 characters.";
    if (!/^[a-zA-Z0-9\s\(\)\-]+$/.test(word))
      return "Word contains invalid characters.";
    return "";
  };

  const validateWordData = (wordData) => {
    return "";
  };

  const validateImage = (file) => {
    if (file.size > 2 * 1024 * 1024)
      return "Image size should not exceed 2 MB.";
    return "";
  };

  const handleInputChange = (index, field, value) => {
    const updatedCharacters = [...characters];
    updatedCharacters[index][field] = value;
    setCharacters(updatedCharacters);
  };

  const handleWordDataTypeChange = (index, type) => {
    const updatedCharacters = [...characters];
    updatedCharacters[index].wordData = "";
    if (type === "image") updatedCharacters[index].wordData = defaultImg;

    setCharacters(updatedCharacters);
  };

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    const error = validateImage(file);
    if (error) {
      setError(error);
      return;
    }

    const updatedCharacters = [...characters];
    const reader = new FileReader();
    reader.onloadend = () => {
      updatedCharacters[index].wordData = reader.result;
      setCharacters(updatedCharacters);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleNewImageUpload = (event) => {
    const file = event.target.files[0];
    const error = validateImage(file);
    if (error) {
      setError(error);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewWordData(reader.result);
      setImagePreview(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleAddWord = () => {
    const wordError = validateWord(newWord);
    const wordDataError = validateWordData(newWordData);
    if (wordError) {
      setError(wordError);
      return;
    }
    if (wordDataError) {
      setError(wordDataError);
      return;
    }

    const newCharacter = {
      word: newWord,
      wordData: newWordData,
    };

    setCharacters([...characters, newCharacter]);
    setShowAddWordForm(false);
    setNewWord("");
    setNewWordData("");
    setWordDataType("text");
    setImagePreview("");
    setError("");
  };

  const handleDelete = (index) => {
    const updatedCharacters = characters.filter((_, i) => i !== index);
    setCharacters(updatedCharacters);
  };

  const handleUpdateData = async () => {
    const titleError = validateWord(title);
    const descriptionError = validateWordData(description);
    if (titleError || descriptionError) {
      setError("Title or Description is invalid.");
      return;
    }

    try {
      const response = await fetch(`/api/list/${listID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newTitle: title,
          newDescription: description,
          newWords: characters,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update data");
      }

      const result = await response.json();

      if (response.ok) {
        // console.log("Backend response:", result);
        alert("Data successfully updated!");
        // Refresh the page after list is deleted
        // location.reload();
      }
    } catch (error) {
      // console.error("Error updating data:", error);
      alert("Error updating data.");
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-8">
      <h1 className="text-2xl font-semibold text-center mb-6">List Editor</h1>

      {/* Top Add Word Button */}
      <Button
        onClick={() => setShowAddWordForm(true)}
        className=" bg-green-600 dark:bg-green-700 text-white flex items-center justify-center text-xl shadow-md hover:bg-green-700 dark:hover:bg-green-800 focus:outline-none"
      >
        Add Word +
      </Button>

      <div className="mb-6 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          placeholder="Enter Title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          placeholder="Enter Description"
          rows="4"
        />
      </div>

      {error && <div className="text-red-500 text-center">{error}</div>}

      <div className="space-y-4">
        {characters.map((character, index) => (
          <div
            key={index}
            className="flex items-center bg-white dark:bg-gray-700 p-4 rounded-lg shadow-lg space-x-4"
          >
            <input
              type="text"
              value={character.word}
              onChange={(e) => handleInputChange(index, "word", e.target.value)}
              className="flex-1 p-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />

            <select
              value={
                character.wordData.includes("data:image") ? "image" : "text"
              }
              onChange={(e) => handleWordDataTypeChange(index, e.target.value)}
              className="bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100 rounded-md p-2"
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
            </select>

            <div className="flex items-center space-x-4">
              {character.wordData.includes("data:image") ? (
                <div
                  className="relative w-24 h-24 border border-dashed border-gray-500 rounded-md"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleImageUpload(index, e)}
                  // onClick={() =>
                  //   document.getElementById(`image-upload-${index}`).click()
                  // }
                >
                  <input
                    type="file"
                    accept="image/*"
                    id={`image-upload-${index}`}
                    onChange={(e) => handleImageUpload(index, e)}
                    className="absolute inset-0 opacity-0"
                  />
                  {character.wordData.includes("data:image") ? (
                    <img
                      src={character.wordData}
                      alt="Uploaded Image"
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-white">
                      +
                    </span>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={character.wordData}
                  onChange={(e) =>
                    handleInputChange(index, "wordData", e.target.value)
                  }
                  className="flex-1 p-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="Enter text for wordData"
                />
              )}

              <button
                onClick={() => handleDelete(index)}
                className="p-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Add Word Button */}
      <Button
        onClick={() => setShowAddWordForm(true)}
        className=" bg-green-600 dark:bg-green-700 text-white flex items-center justify-center text-xl shadow-md hover:bg-green-700 dark:hover:bg-green-800 focus:outline-none"
      >
        Add Word +
      </Button>

      {showAddWordForm && (
        <div className="space-y-4 p-6 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-xl font-semibold">Add a New Word</h3>
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className="w-full p-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100"
            placeholder="Enter new word"
          />

          <div className="space-y-4">
            <label className="block text-gray-900 dark:text-gray-100">
              Word Type
            </label>
            <select
              value={wordDataType}
              onChange={(e) => setWordDataType(e.target.value)}
              className="bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100 rounded-md p-2"
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
            </select>
          </div>

          {wordDataType === "image" ? (
            <input
              type="file"
              accept="image/*"
              onChange={handleNewImageUpload}
              className="w-full p-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100"
            />
          ) : (
            <input
              type="text"
              value={newWordData}
              onChange={(e) => setNewWordData(e.target.value)}
              className="w-full p-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100"
              placeholder="Enter new word data"
            />
          )}

          <div className="text-center mt-4">
            <button
              onClick={handleAddWord}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md shadow-md hover:bg-blue-700 dark:hover:bg-blue-800"
            >
              Add Word
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleUpdateData}
          className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md shadow-md hover:bg-blue-700 dark:hover:bg-blue-800"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ListItemEditor;
