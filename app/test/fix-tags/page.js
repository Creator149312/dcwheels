"use client";
import { useState } from "react";

export default function CheckTagsPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0); // track batch page entered by user

  // const runCheck = async () => {
  //   setLoading(true);
  //   try {
  //     // batch size = 20
  //     const res = await fetch(`/api/fix-tags?limit=40&page=${page}`, {
  //       method: "POST",
  //     });
  //     const data = await res.json();
  //     setResult(data.message || data.error);
  //   } catch (err) {
  //     setResult("Error: " + err.message);
  //   }
  //   setLoading(false);
  // };

  return (
    // <div style={{ padding: "2rem" }}>
    //   <h1>Tag Validation & Fixing (Batch Mode)</h1>

    //   {/* Input field for page number */}
    //   <div style={{ marginBottom: "1rem" }}>
    //     <label htmlFor="pageInput">Page Number: </label>
    //     <input
    //       id="pageInput"
    //       type="number"
    //       min="0"
    //       value={page}
    //       onChange={(e) => setPage(parseInt(e.target.value, 10))}
    //       style={{ width: "60px", marginLeft: "0.5rem" }}
    //     />
    //   </div>

    //   <button onClick={runCheck} disabled={loading}>
    //     {loading ? "Checking..." : `Run Batch (Page ${page})`}
    //   </button>

    //   {result && <p style={{ marginTop: "1rem" }}>{result}</p>}
    // </div>
    <></>
  );
}
