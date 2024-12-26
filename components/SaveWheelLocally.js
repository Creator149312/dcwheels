import { useContext, useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { Button } from "./ui/button";
import Tooltip from "./Tooltip";
import { SegmentsContext } from "@app/SegmentsContext";

const SaveWheelLocally = () => {
  // State to manage modal visibility and form data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // const [data, setData] = useState(segmentsData);
  const { data, wheelData } = useContext(SegmentsContext);


  // Show modal when user wants to save
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Close modal without saving
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Save the data and trigger file download
  const handleSaveData = () => {
    setIsSaving(true);

    // Prepare the page data with user input
    const pageData = {
      title: title || "Default Title", // Default title if no input
      description: description || "Default Description", // Default description if no input
      data: data.map(item => item.option),
      wheelData: wheelData
    };

    // Convert the page data to a JSON string
    const jsonData = JSON.stringify(pageData, null, 2);

    // Create a Blob from the JSON string
    const blob = new Blob([jsonData], { type: "application/json" });

    // Create an object URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.json`; // Set the filename for the download
    a.click(); // Programmatically click the anchor to trigger the download

    // Release the object URL after triggering the download
    URL.revokeObjectURL(url);

    // Close the modal after saving
    setIsModalOpen(false);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col items-center justify-center py-2">
      {/* <button
        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none"
        onClick={handleOpenModal}
      >
        Save Wheel Locally
      </button> */}
        <Button
          size={"lg"}
          className="mr-1 p-3 rounded-md text-sm focus:outline-none"
          onClick={handleOpenModal}
          disabled={isSaving}
        >
          {isSaving ? (
            <span>Downloading...</span>
          ) : (
            <>
              Download <FaDownload size={15} className="ml-1" />
            </>
          )}
        </Button>
      {/* Modal for title and description input */}
      {isModalOpen && (
        <div className="z-10 fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Enter Page Details
            </h2>
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                className="mt-1 p-2 w-full border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <textarea
                id="description"
                className="mt-1 p-2 w-full border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                className="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 dark:bg-blue-700 py-2 px-4 rounded-md text-white hover:bg-blue-600 dark:hover:bg-blue-800 focus:outline-none"
                onClick={handleSaveData}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveWheelLocally;
