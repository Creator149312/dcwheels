import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
// import { performance } from "perf_hooks";

let titleStr = "";
let listerror = null;

/*
 *  This file is used for user generated wheels which are saved in database.
 */

export async function generateMetadata({ params }, parent) {
  let listdata = null;
  //check if ID is valid
  if (validateObjectID(params.wheelId)) {
    const id = params.wheelId;
    try {
      const response = await fetch(`${apiConfig.apiUrl}/wheel/${id}`, {
        cache: "no-store",
      }); // Replace with your actual API endpoint

      if (!response.ok) throw new Error("Failed to fetch Wheels");

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
    titleStr = listdata.title;
    const descriptionStr =
      "Explore " + listdata.title + " and spin to pick a random choice.";
    return {
      title: titleStr,
      description: descriptionStr,
      // robots: 'noindex'
    };
  } else {
    return {
      title: "No Wheels Found",
      description: "No Wheels Found",
      robots: "noindex",
    };
  }
}

let wordsList = null;

export default async function Page({ params }) {
  let IfIdValid = validateObjectID(params.wheelId);
  // const startDB = performance.now();
  if (IfIdValid) {
    const id = params.wheelId;
    try {
      const response = await fetch(`${apiConfig.apiUrl}/wheel/${id}`, {
        cache: "no-store",
      }); // Replace with your actual API endpoint

      if (!response.ok) {
        throw new Error("Failed to fetch Wheels");
      }

      const data = await response.json();
      wordsList = data.list;

      // await connectMongoDB();
      // wordsList = await List.findOne({ _id: id });
    } catch (error) {
      listerror = error;
    } finally {
      if (wordsList === null) {
        listerror = { message: "No Wheels Found" };
      }
    }

    // const endDB = performance.now();
    // console.log(`⏱️ Database fetch time: ${(endDB - startDB).toFixed(2)} ms`);
  }

  // const startRender = performance.now();

  return (
    <div>
      {wordsList !== null && listerror == null && (
        <>
          {/* <WheelWithInput newSegments={wordsList.data}/> */}
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={
              wordsList?.wheelData ? wordsList?.wheelData : null
            }
          />
          <div className="mt-3 p-2">
            <h1 className="text-3xl m-2 flex">{wordsList.title}</h1>
            <p>{wordsList.description}</p>
          </div>
        </>
      )}
      {listerror && (
        <div>
          We cannot find any Wheel. This has been deleted by the creator.
        </div>
      )}
    </div>
  );
}
