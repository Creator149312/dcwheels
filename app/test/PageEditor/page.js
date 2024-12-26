'use client'
import { useState } from 'react';

const PageEditor = () => {
  const initialData = {
    colorSettings: [
      { color: "#3369E8", enabled: true },
      { color: "#D50F25", enabled: true },
      { color: "#EEB211", enabled: true },
      { color: "#009925", enabled: true },
      { color: "#000000", enabled: false },
      { color: "#000000", enabled: false },
    ],
    description: "",
    entries: [
      { text: "Ali" },
      { text: "Beatriz" },
      { text: "Charles" },
      { text: "Diya" },
      { text: "Eric" },
      { text: "Fatim" },
      { text: "Hanna" },
      { text: "Victor" },
      { text: "Albert" },
    ],
    isAdvanced: false,
    maxNumberOfDivs: 10,
    pageBackgroundColor: "#FFFFFF",
    showTitle: true,
    title: "simple",
  };

  const [data, setData] = useState(initialData);

  // Handle the changes to the text of the divs
  const handleTextChange = (index, newText) => {
    const updatedEntries = [...data.entries];
    updatedEntries[index].text = newText;
    setData({ ...data, entries: updatedEntries });
  };

  // Handle the background color change
  const handleBackgroundColorChange = (e) => {
    setData({ ...data, pageBackgroundColor: e.target.value });
  };

  // Handle the title change
  const handleTitleChange = (e) => {
    setData({ ...data, title: e.target.value });
  };

  // Handle color setting enable/disable
  const handleColorToggle = (index) => {
    const updatedColorSettings = [...data.colorSettings];
    updatedColorSettings[index].enabled = !updatedColorSettings[index].enabled;
    setData({ ...data, colorSettings: updatedColorSettings });
  };

  return (
    <div style={{ backgroundColor: data.pageBackgroundColor }}>
      <h1>{data.showTitle ? data.title : ""}</h1>

      <div>
        <h2>Edit Page Background</h2>
        <input
          type="color"
          value={data.pageBackgroundColor}
          onChange={handleBackgroundColorChange}
        />
      </div>

      <div>
        <h2>Edit Title</h2>
        <input
          type="text"
          value={data.title}
          onChange={handleTitleChange}
        />
      </div>

      <div>
        <h2>Entries</h2>
        {data.entries.slice(0, data.maxNumberOfDivs).map((entry, index) => (
          <div key={index} style={{ margin: '10px', padding: '10px', backgroundColor: data.colorSettings[index % data.colorSettings.length].enabled ? data.colorSettings[index % data.colorSettings.length].color : 'transparent' }}>
            <input
              type="text"
              value={entry.text}
              onChange={(e) => handleTextChange(index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div>
        <h2>Color Settings</h2>
        {data.colorSettings.map((colorSetting, index) => (
          <div key={index} style={{ margin: '5px' }}>
            <input
              type="checkbox"
              checked={colorSetting.enabled}
              onChange={() => handleColorToggle(index)}
            />
            <span style={{ marginLeft: '10px' }}>{colorSetting.color}</span>
          </div>
        ))}
      </div>

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default PageEditor;
