"use client";

import { HiOutlineTrash } from "react-icons/hi";
import { useRouter } from "next/navigation";
import apiConfig from "@utils/ApiUrlConfig";
// import apiConfig from "@utils/apiUrlConfig";

export default function RemoveListBtn({ id }) {
  const router = useRouter();

  const handleRemoveList = async (e) => {
    e.preventDefault();
    await removeList();
  };

  const removeList = async () => {
    const confirmed = confirm("Are you sure?");

    if (confirmed) {
      const res = await fetch(`${apiConfig.apiUrl}/wheel?id=${id}`, {
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
