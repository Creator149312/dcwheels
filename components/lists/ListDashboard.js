import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ListCreationModal from "./ListCreationModal";
import toast from "react-hot-toast";
import { Button } from "@components/ui/button";

const ListDashboard = () => {
  const [lists, setLists] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const fetchLists = async () => {
        const res = await fetch(`/api/lists/user/${session?.user?.email}`);
        const data = await res.json();
        setLists(data.lists);
      };
      fetchLists();
    }
  }, [status]);

  const handleNewListClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const addNewList = async (listData) => {
    const res = await fetch("/api/lists", {
      method: "POST",
      body: JSON.stringify(listData),
      headers: { "Content-Type": "application/json" },
    });

    if (res.error) {
      toast.error("Failed to Create List!");
    } else {
      toast.success("List Created Successfully!");
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>You need to be logged in to view this page.</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold mb-2">My Lists</h2>
        <Button size={"lg"} variant={"default"} onClick={handleNewListClick}>
          Create List +
        </Button>
      </div>
      <div className="p-6">
        <div className="mt-6">
          {lists.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              You have no lists yet. Start by creating one!
            </p>
          ) : (
            lists.map((list) => (
              <div
                key={list._id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 mb-4"
              >
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {list.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {list.description}
                </p>
                <ul className="mt-2">
                  {list.words.map((wordData, index) => (
                    <li key={index}>
                      <strong>{wordData.word}:</strong>
                      {wordData.wordData.includes("image/") ? (
                        <img src={`${wordData.wordData}`} width="50" />
                      ) : (
                        wordData.wordData
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* List Creation Modal */}
        <ListCreationModal
          isOpen={isModalOpen}
          closeModal={handleModalClose}
          addNewList={addNewList}
        />
      </div>
    </>
  );
};

export default ListDashboard;
