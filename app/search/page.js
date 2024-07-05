// import ListDisplay from "@components/ListDisplay";
import RemoveListBtn from "@components/RemoveListBtn";
import SearchBarNav from "@components/SearchNavBar";
import WheelWithInput from "@components/WheelWithInput";
import { Card } from "@components/ui/card";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { validateObjectID } from "@utils/Validator";
import Link from "next/link";
import { HiOutlineEye, HiPencilAlt } from "react-icons/hi";

let titleStr = "";
let listerror = null;
let wordsList = null;

export default  function Page() {
  return (
    <>
      <div className="bg-card text-card-foreground w-full"><SearchBarNav /></div>
      <div>search Wheels to see the list of wheels here</div>
    </>
  );
}
