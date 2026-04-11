'use client'
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

export default function ShowSlugs() {
  const [slugs, setSlugs] = useState([]);
  const [limit, setLimit] = useState(10);
  const [skip, setSkip] = useState(0);

  async function fetchSlugs() {
    try {
      const res = await fetch(`/api/slugExtraction?limit=${limit}&skip=${skip}`);
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await res.json();
      setSlugs(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setSlugs([]); // fallback to empty array
    }
  }

  useEffect(() => {
    fetchSlugs();
  }, [limit, skip]);

  function downloadExcel() {
    if (!slugs.length) {
      alert("No data to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(slugs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Slugs");
    XLSX.writeFile(workbook, "pages_slugs.xlsx");
  }

  return (
    <div>
      <h1>Page Slugs</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Limit:{" "}
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
        <label style={{ marginLeft: "1rem" }}>
          Skip:{" "}
          <input
            type="number"
            value={skip}
            onChange={(e) => setSkip(Number(e.target.value))}
          />
        </label>
        <button onClick={fetchSlugs}>Fetch</button>
      </div>

      <ul>
        {slugs.map((page, index) => (
          <li key={index}>{page.slug}</li>
        ))}
      </ul>

      <button onClick={downloadExcel}>Download Excel</button>
    </div>
  );
}
