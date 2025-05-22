"use client";
import { useEffect, useState } from "react";
import apiConfig from "@utils/ApiUrlConfig";

const CreatePageForm = ({ Wheels = [] }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedWheel, setSelectedWheel] = useState("");
  const [wheels, setWheels] = useState(Wheels);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const pageData = {
      title,
      content: JSON.parse(content),
      slug,
      wheel: selectedWheel,
    };

    const response = await fetch("/api/page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    });

    if (response.ok) {
      alert("Page created successfully!");
    } else {
      alert("Failed to create page.");
    }
  };

  const handleWheelChange = (e) => {
    setSelectedWheel(e.target.value);
    console.log("Target Value = ", e.target.value);
  };

  useEffect(() => {
    const loadWheels = async (e) => {
      const createdBy = "gauravsingh9314@gmail.com";
      try {
        const response = await fetch(
          `${apiConfig.apiUrl}/wheel/user/${createdBy}`
        );

        if (response.ok) {
          const wheelsArr = await response.json();
          setWheels(wheelsArr.lists);
          console.log("Existing Wheels", wheelsArr.lists);
        }
      } catch (error) {
        setError("Failed to load wheels.");
      } finally {
        setIsLoading(false);
      }
    };

    loadWheels();
  }, []);

  return (
    <>
      {isLoading && (
        <div className="flex justify-center items-center">
          <p className="text-xl font-bold m-2">Fetching Your Wheels ...</p>
        </div>
      )}
      {error && (
        <div className="flex justify-center items-center">
          <p className="text-xl font-bold m-2">Failed to Load Your Wheels</p>
        </div>
      )}
      {wheels.length > 0 && (
        <form
          onSubmit={handleFormSubmit}
          className="max-w-lg mx-auto p-4 bg-white shadow-md rounded"
        >
          <h2 className="text-xl font-bold mb-4">Create New Page</h2>
          <div className="mb-4">
            <label className="block text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <textarea
            id="content"
            value={content}
            onChange={(e) => {setContent(e.target.value);
                console.log("Parsed JSON = " + JSON.stringify(e.target.value)); }}
            placeholder={`Enter content as JSON... e.g., ${JSON.stringify(
              [
                {
                  type: "paragraph",
                  text: "Your text here...",
                },
              ],
              null,
              2
            )}`}
            rows="10"
            cols="50"
            required
          />
          <div className="mb-4">
            <label className="block text-gray-700">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Select Wheel</label>
            <select
              value={selectedWheel}
              onChange={handleWheelChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select a Wheel</option>
              {wheels.map((wheel) => (
                <option key={wheel._id} value={wheel._id}>
                  {wheel.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Page
          </button>
        </form>
      )}{" "}
    </>
  );
};

export default CreatePageForm;
