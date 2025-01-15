"use client";

import Link from "next/link";
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
          <Card key={index} className="p-2 mt-3">
            <div className="leading-normal m-2 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold m-2">{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <div>{item.data.length} Words</div>
            </div>
            <div className="flex items-center">
              <Link href={`/uwheels/${item._id}`} className="m-2">
                <HiOutlineEye size={24} />
              </Link>
              <Link href={`/uwheels/${item._id}`} className="m-2">
                <HiPencilAlt size={24} />
              </Link>
              <SharePopup url={`/uwheels/${item._id}`} buttonVariant="simple"/>
              <RemoveListBtn id={item._id} className="m-2" />
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
