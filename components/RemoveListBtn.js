"use client";

import { HiOutlineTrash } from "react-icons/hi";
import { useRouter } from "next/navigation";
import apiConfig from "@utils/ApiUrlConfig";
export default function RemoveListBtn({ id, type }) {
  const router = useRouter();

  const handleRemoveList = async (e) => {
    e.preventDefault();
    await removeList();
  };

  const removeList = async () => {
    const confirmed = confirm("Are you sure?");

    if (confirmed) {
      let fetchURLPath = `${apiConfig.apiUrl}/${type}?id=${id}`;

      const res = await fetch(fetchURLPath, {
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
      <HiOutlineTrash size={24} />
    </a>
  );
}
