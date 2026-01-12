"use client";
import { Card } from "@components/ui/card";
import { useEffect, useState } from "react";

export default function HistoryList() {
  const [items, setItems] = useState([]);
  // useEffect(() => {
  //   fetch("/api/history/list")
  //     .then((r) => r.json())
  //     .then((d) => setItems(d.history ?? []))
  //     .catch(() => {});
  // }, []);

  return (
    // <div className="space-y-3">
    //   {items.map((item) => (
    //     <Card className="p-1 sm:p-2 mt-3">
    //       <div className="leading-normal m-2 flex flex-col md:flex-row justify-between items-center">
    //         <a
    //           key={item._id}
    //           href={`/uwheels/${item._id}`}
    //           className="block hover:underline"
    //         >
    //           {item.title}
    //         </a>
    //       </div>
    //     </Card>
    //   ))}
    // </div>
    <></>
  );
}
