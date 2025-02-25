import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ListCreationModal from "./ListCreationModal";
import toast from "react-hot-toast";
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import RemoveListBtn from "@components/RemoveListBtn";
import { HiOutlineEye } from "react-icons/hi";
import SharePopup from "@components/SharePopup";

const ListDashboard = () => {
  const [lists, setLists] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const fetchLists = async () => {
        const res = await fetch(`/api/list/user/${session?.user?.email}`);
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
    const res = await fetch("/api/list", {
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
      <div >
        <div className="mt-6">
          {lists.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              You have no lists yet. Start by creating one!
            </p>
          ) : (
            lists.map((item, index) => (
              <>
                <Card key={index} className="p-2 mt-3">
                  <div className="leading-normal m-2 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold m-2">{item.title}</h2>
                    </div>

                    <div className="flex items-center">
                      <div className="mx-2">{item.words.length} Words</div>
                      <a href={`/ulists/${item._id}`} className="mx-2">
                        <HiOutlineEye size={24} />
                      </a>
                      <SharePopup
                        url={`/ulists/${item._id}`}
                        buttonVariant="simple"
                      />
                      <RemoveListBtn id={item._id} type={"list"} />
                    </div>
                  </div>
                </Card>
              </>
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
