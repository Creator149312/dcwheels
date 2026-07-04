"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
export default function RemoveListBtn({ id, type }) {
  const router = useRouter();

  const handleRemoveList = async (e) => {
    e.preventDefault();
    await removeList();
  };

  const removeList = async () => {
    const confirmed = confirm("Are you sure?");

    if (confirmed) {
      const url = type === "unifiedlist" ? `/api/unifiedlist/${id}` : `/api/${type}?id=${id}`;
      const res = await fetch(url, {
        method: "DELETE",
      });

      if (res.ok) {
        // Refresh the page after list is deleted
        location.reload();
      }
    }
  };

  return (
    <a onClick={handleRemoveList} className="mx-2 my-2">
      <Trash2 size={24} />
    </a>
  );
}
