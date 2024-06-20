"use client";

import { HiOutlineTrash } from "react-icons/hi";
import { useRouter } from "next/navigation";
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
      const res = await fetch(`https://ominous-engine-q766v6jx45r34qx9-3000.app.github.dev/api/wheel?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Refresh the page after list is deleted
        location.reload();
      }
    }
  };

  return (
    <a onClick={handleRemoveList} >
      <HiOutlineTrash size={24} />
    </a>
  );
}