"use client";

import Link from "next/link";
import RemoveListBtn from "./RemoveListBtn";
import { HiPencilAlt } from "react-icons/hi";
import { HiOutlineEye } from "react-icons/hi";
import { useState, useEffect } from "react";
// import apiConfig from "@utils/apiUrlConfig";

export default function WordLists({ createdBy }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  //fetch data for Dashboard display
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://ominous-engine-q766v6jx45r34qx9-3000.app.github.dev/api/wheel/user/${createdBy}`,
          { cache: "no-store" }
        ); 

        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }

        const data = await response.json();
        setData(data.lists);
      } catch (error) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (createdBy !== undefined) fetchData();
  }, [createdBy]);

  return (
    <div>
      {isLoading && <p>Fetching Your Lists ...</p>}
      {error && <p>Failed to Load Your Lists</p>}
      {/* show the lists if data is found */}
      {data.length > 0 &&
        data.map((item, index) => (
          <div key={index} className="card p-2 m-3">
            <div className="card-content m-2 list-heading-container">
              <div>
                <h2 className="card-title">{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <div>{item.data.length} Words</div>
            </div>
            <div className="card-footer">
              <Link href={`/wheels/${item._id}`}>
                <HiOutlineEye size={24} />
              </Link>
              <Link href={`/wheels/${item._id}`}>
                <HiPencilAlt size={24} />
              </Link>
              <RemoveListBtn id={item._id} />
            </div>
          </div>
        ))}
      {/* if data is loading is finished and data array is still empty  */}
      {!isLoading && data.length === 0 && (
        <p className="text-center">
          No Lists Found. Create Your Lists and Starting Learning!
        </p>
      )}
    </div>
  );
}