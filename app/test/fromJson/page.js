"use client";
import { useState } from "react";

export default function CreateFromJSON() {
  const [jsonInput, setJsonInput] = useState("");
  const [message, setMessage] = useState("");

  const [jsonKey, setJsonKey] = useState("");

  const handleChange = (event) => {
    setJsonInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const parsedJson = JSON.parse(jsonInput); // Try to parse the JSON input

      // Get the first key of the parsed JSON object (e.g., 'races_creatures_picker_wheel')
      const firstKey = Object.keys(parsedJson)[0];

      setJsonKey(firstKey); // Update the state to show the key

      // Add the key to the JSON data
      const completeJSON = {
        jsonKey: firstKey, // Pass the key to the API
        jsonData: parsedJson[firstKey], // Pass the actual data from the key
      };

      const res = await fetch("/api/createFromJSON", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(completeJSON),
      });

      const result = await res.json();

      if (res.status === 201) {
        setMessage("Wheel and Page created successfully!");
      } else {
        setMessage("Error: " + result.message);
      }
    } catch (error) {
      setMessage("Invalid JSON format. Please check your input.");
    }
  };

  return (
    <div>
      <h1>Enter JSON to Create a Wheel and Page</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={jsonInput}
          onChange={handleChange}
          rows="15"
          cols="80"
          placeholder="Enter JSON data here"
        />
        <br />
        <button type="submit">Create Wheel and Page</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
