"use client";

import Link from "next/link";
import RemoveListBtn from "./RemoveListBtn";
import { HiPencilAlt } from "react-icons/hi";
import { HiOutlineEye } from "react-icons/hi";
import { useState, useEffect } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { Card } from "./ui/card";
import SharePopup from "./SharePopup";
import EmptyState from "./EmptyState";
import { Layers } from "lucide-react";

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
          // Allow Next's data layer to cache identical user-wheel-list payloads
          // for 30s. The save flow already optimistically updates the local
          // list, so brief staleness on cross-tab views is acceptable.
          { next: { revalidate: 30 } }
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
                <Link href={`/uwheels/${item._id}`} className="mx-2">
                  <HiOutlineEye size={24} />
                </Link>
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
        <div className="py-8">
          <EmptyState
            icon={Layers}
            title="No wheels yet"
            description="Create your first wheel and start exploring randomness."
            action={{ label: "Create a wheel", href: "/" }}
          />
        </div>
      )}
    </div>
  );
}
