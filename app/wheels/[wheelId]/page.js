// import ListDisplay from "@components/ListDisplay";
import WheelWithInput from "@components/WheelWithInput";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { validateObjectID } from "@utils/Validator";

let titleStr = "";
let listerror = null;

export async function generateMetadata({ params }, parent) {
  let listdata = null;
  //check if ID is valid
  if (validateObjectID(params.wheelId)) {
    const id = params.wheelId;
    try {
      const response = await fetch(`http://localhost:3000/api/wheel/${id}`, {
        cache: "no-store",
      }); // Replace with your actual API endpoint

      if (!response.ok) throw new Error("Failed to fetch lists");

      listdata = (await response.json()).list;
    } catch (error) {
      listerror = error;
    } finally {
      if (listdata === null) {
        listerror = { message: "No records Found" };
      }
    }
  }

  if (listdata !== null) {
    // read route params
    titleStr = listdata.title + " Learning Flashcards";
    const descriptionStr =
      "Explore list of " + listdata.title + " and practice using flashcards.";
    return {
      title: titleStr,
      description: descriptionStr,
    };
  } else {
    return {
      title: "No List Found",
      description: "No List Found",
    };
  }
}

let wordsList = null;

export default async function Page({ params }) {
  let IfIdValid = validateObjectID(params.wheelId);
  if (IfIdValid) {
    const id = params.wheelId;
    try {
      const response = await fetch(`http://localhost:3000/api/wheel/${id}`, {
        cache: "no-store",
      }); // Replace with your actual API endpoint

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
  }

  return (
    <div>
      {wordsList !== null && listerror == null && (
        <WheelWithInput newSegments={wordsList.data}/>
      )}
      {listerror && (
        <div>We can't find the list. This has been deleted by the creator.</div>
      )}
    </div>
  );
}
