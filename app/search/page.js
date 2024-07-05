// import ListDisplay from "@components/ListDisplay";
import RemoveListBtn from "@components/RemoveListBtn";
import SearchBarNav from "@components/SearchNavBar";
import WheelWithInput from "@components/WheelWithInput";
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { validateObjectID } from "@utils/Validator";
import Link from "next/link";
import { HiOutlineEye, HiPencilAlt } from "react-icons/hi";

let titleStr = "";
let listerror = null;
let wordsList = null;

export default function Page() {
  return (
    <>
      <div className="bg-card text-card-foreground w-full">
        <SearchBarNav />
        <div className="text-center p-3">
        <div className="text-lg pt-2">
          search Wheels to see the list of wheels here
        </div>
        <div className="text-lg pt-2">
          You can create your own wheels by{" "}
          <a href="/register">
            <Button variant={"default"} size={"lg"}>
              Creating an Account
            </Button>
          </a>
        </div>
      </div>
      </div>
     
    </>
  );
}
