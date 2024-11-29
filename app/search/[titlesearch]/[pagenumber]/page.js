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
import apiConfig from "@utils/ApiUrlConfig";
import { Pagination } from "@components/ui/pagination";
import BottomPagination from "@components/BottomPagination";

let titleStr = "";
let listerror = null;
const perPage = 10;
let start = 0;

export async function generateMetadata({ params }, parent) {
  let listdata = null;
  //check if ID is valid

  const searchtitle = params.titlesearch;
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/wheel/search/${searchtitle}`,
      {
        cache: "no-store",
      }
    ); // Replace with your actual API endpoint

    if (!response.ok) throw new Error("Failed to fetch lists");

    listdata = (await response.json()).list;
  } catch (error) {
    listerror = error;
  } finally {
    if (listdata === null) {
      listerror = { message: "No records Found" };
    }
  }

  if (listdata !== null) {
    // read route params
    titleStr = searchtitle + " Wheels";
    const descriptionStr =
      "Explore list of " + searchtitle + " and practice using flashcards.";
    return {
      title: titleStr,
      description: descriptionStr,
    };
  } else {
    return {
      title: "No Wheels Found",
      description: "No Wheels Found",
    };
  }
}

let wordsList = null;

const printSearchData = (wheelList) => {
  let wheelData = [];
  let end = wheelList.length > start + perPage ? start + perPage : wheelList.length;
  for (var i = start; i < end; i++) {
    let item = wheelList[i];

    // console.log("Title of Wheel = ", item.title);
    wheelData.push(
      <Card key={i} className="p-2 mt-3 mx-4">
        <div className="text-base leading-normal m-2 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            {/* <p>{item.description}</p> */}
          </div>
          <div>{item.data.length} Words</div>
        </div>
        <div className="flex items-center">
          <Link href={`/uwheels/${item._id}`} className="p-2">
            <HiOutlineEye size={24} />
          </Link>
          {/* <Link href={`/uwheels/${item._id}`} className="p-2">
            <HiPencilAlt size={24} />
          </Link>
          <RemoveListBtn id={item._id} className="p-2" /> */}
        </div>
      </Card>
    );
  }

  return wheelData;
};

export default async function Page({ params }) {
  const searchtitle = params.titlesearch;
  start = (params.pagenumber - 1) * perPage;
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/wheel/search/${searchtitle}`,
      {
        cache: "no-store",
      }
    ); // Replace with your actual API endpoint

    if (!response.ok) {
      throw new Error("Failed to fetch lists");
    }

    const data = await response.json();
    wordsList = data.list;

    // await connectMongoDB();
    // wordsList = await List.findOne({ _id: id });
  } catch (error) {
    listerror = error;
  } finally {
    if (wordsList === null) {
      listerror = { message: "No records Found" };
    }
  }

  return (
    <>
      <div className="bg-card text-card-foreground w-full">
        <SearchBarNav />
      </div>
      <div>
        {wordsList !== null &&
          listerror == null &&
          wordsList.length > 0 &&
          //   wordsList.map((item, index) => (
          //     <Card key={index} className="p-2 mt-3">
          //       <div className="text-base leading-normal m-2 flex justify-between items-center">
          //         <div>
          //           <h2 className="text-xl font-bold mb-2">{item.title}</h2>
          //           <p>{item.description}</p>
          //         </div>
          //         <div>{item.data.length} Words</div>
          //       </div>
          //       <div className="flex items-center">
          //         <Link href={`/wheels/${item._id}`} className="p-2">
          //           <HiOutlineEye size={24} />
          //         </Link>
          //         <Link href={`/wheels/${item._id}`} className="p-2">
          //           <HiPencilAlt size={24} />
          //         </Link>
          //         <RemoveListBtn id={item._id} className="p-2" />
          //       </div>
          //     </Card>
          //   ))
          printSearchData(wordsList).map((item, index) => item)}
        {listerror && (
          <div>
            We cant find the list. This has been deleted by the creator.
          </div>
        )}
      </div>
      <BottomPagination data={wordsList} perPage={perPage} searchValue={searchtitle} pagenumber={params.pagenumber}/>
    </>
  );
}
