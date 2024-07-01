"use client";
import { useEffect, useState } from "react";

function ResultList({ result }) {
//   const [result, setResult] = useState("");

//   console.log("winner is ", winner);
//   console.log("Result Array \n", result);

//   useEffect(() => {
//     if (winner !== "" && winner !== undefined) {
//       if (result.length === 0) setResult((prev) => prev + winner);
//       else setResult((prev) => prev + "\n" + winner);
//     }
//   }, [winner]);

  //   const setResultText = () => {
  //     const lines = "";
  //     for (let i = 0; i < result.length - 1; i++) {
  //       if (result[i] !== "" && result[i] !== undefined)
  //         lines += result[i] + "\n";
  //     }

  //     lines += result[result.length - 1];
  //   };

  return (
    <div className="flex flex-col gap-4">
      <textarea
        defaultValue={result}
        placeholder="Enter your text here..."
        rows={10} // Adjust rows as needed
        className="rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

export default ResultList;
