// import ListDisplay from "@components/ListDisplay";
import RemoveListBtn from "@components/RemoveListBtn";
import WheelWithInput from "@components/WheelWithInput";
import { Card } from "@components/ui/card";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { validateObjectID } from "@utils/Validator";
import Link from "next/link";
import { HiOutlineEye, HiPencilAlt } from "react-icons/hi";

let titleStr = "";
let listerror = null;

export async function generateMetadata({ params }, parent) {
  let listdata = null;
  //check if ID is valid
  const searchtitle = params.titlesearch;
  try {
    const response = await fetch(
      `http://localhost:3000/api/wheel/search/${searchtitle}`,
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
    titleStr =  searchtitle + " Wheels";
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

export default async function Page({ params }) {
  const searchtitle = params.titlesearch;
  try {
    const response = await fetch(
      `http://localhost:3000/api/wheel/search/${searchtitle}`,
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
    <div>
      {wordsList !== null &&
        listerror == null &&
        wordsList.length > 0 &&
        wordsList.map((item, index) => (
          <Card key={index} className="p-2 mt-3">
            <div className="text-base leading-normal m-2 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <div>{item.data.length} Words</div>
            </div>
            <div className="flex items-center">
              <Link href={`/wheels/${item._id}`} className="p-2">
                <HiOutlineEye size={24} />
              </Link>
              <Link href={`/wheels/${item._id}`} className="p-2">
                <HiPencilAlt size={24} />
              </Link>
              <RemoveListBtn id={item._id} className="p-2" />
            </div>
          </Card>
        ))}
      {listerror && (
        <div>We can't find the list. This has been deleted by the creator.</div>
      )}
    </div>
  );
}
