import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getServerSession } from "@node_modules/next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { getContentStats } from "@components/actions/actions";
import WheelInfoSection from "@components/WheelMeta";
import User from "@models/user";

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
  const session = await getServerSession(authOptions);
  let IfIdValid = validateObjectID(params.wheelId);
  // Identify user who created the wheel
  let username = null;
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

      const user = await User.findOne({ email: wordsList.createdBy }).lean();
      if (user) username = user.name;
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
  const stats = await getContentStats({
    entityType: "wheel",
    entityId: params.wheelId,
  });

  // console.log(stats);
  return (
    <div>
      {wordsList !== null && listerror == null && (
        <>
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={
              wordsList?.wheelData ? wordsList?.wheelData : null
            }
          />

          <WheelInfoSection
            wordsList={wordsList}
            stats={stats}
            session={session}
            wheelId={params.wheelId}
            username={username}
          />
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
