"use client";

import RemoveListBtn from "./RemoveListBtn";
import { HiPencilAlt } from "react-icons/hi";
import { HiOutlineEye } from "react-icons/hi";
import { useState, useEffect } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { Card } from "./ui/card";
import SharePopup from "./SharePopup";

export default function WordLists({ createdBy }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  //fetch data for Dashboard display
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${apiConfig.apiUrl}/wheel/user/${createdBy}`,
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
      {/* show the lists if data is found */}
      {data.length > 0 &&
        data.map((item, index) => (
          <Card key={index} className="p-1 sm:p-2 mt-3">
            <div className="leading-normal m-2 flex flex-col md:flex-row justify-between items-center">
              <p className="text-lg font-bold m-1">{item.title}</p>
              <div className="flex items-center mt-1">
                <div className="mx-2">{item.data.length} Options</div>
                <a href={`/uwheels/${item._id}`} className="mx-2">
                  <HiOutlineEye size={24} />
                </a>
                <SharePopup
                  url={`/uwheels/${item._id}`}
                  variant="simple"
                />
                <RemoveListBtn id={item._id} type={"wheel"} />
              </div>
            </div>
          </Card>
        ))}
      {/* if data is loading is finished and data array is still empty  */}
      {!isLoading && data.length === 0 && (
        <p className="text-center text-xl m-4">
          No Wheels Found. Create Your Wheels and Start Exploring Randomness!
        </p>
      )}
    </div>
  );
}
