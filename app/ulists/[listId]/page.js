import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";

import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { Card } from "@components/ui/card";
import ListItemEditor from "@components/lists/ListItemEditor";
import { getServerSession } from "next-auth";
import ListDisplayPage from "@components/lists/ListDisplayPage";

let titleStr = "";
let listerror = null;

/*
 *  This file is used for user generated lists which are saved in database.
 */
export async function generateMetadata({ params }, parent) {
  let listdata = null;
  //check if ID is valid
  if (validateObjectID(params.listId)) {
    const id = params.listId;
    try {
      const response = await fetch(`${apiConfig.apiUrl}/list/${id}`, {
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
      "Explore " + listdata.title;
    return {
      title: titleStr,
      description: descriptionStr,
      // robots: 'noindex'
    };
  } else {
    return {
      title: "No Lists Found",
      description: "No Lists Found",
      robots: "noindex",
    };
  }
}

let wordsList = null;

export default async function Page({ params }) {
  const session = await getServerSession(authOptions);

  // console.log("Session DATA", session);
  let IfIdValid = validateObjectID(params.listId);
  if (IfIdValid) {
    const id = params.listId;
    try {
      const response = await fetch(`${apiConfig.apiUrl}/list/${id}`); // Replace with your actual API endpoint

      if (!response.ok) {
        throw new Error("Failed to fetch List");
      }

      const data = await response.json();
      wordsList = data.list;

      // console.log("DATA List", wordsList);
    } catch (error) {
      listerror = error;
    } finally {
      if (wordsList === null) {
        listerror = { message: "No List Found" };
      }
    }
  }

  // Check if the current user is the creator of the list
  const isCreator = session?.user?.email === wordsList?.createdBy;

  return (
    <div>
      <div className="min-h-screen p-6">
        {/* Conditional rendering */}
        {wordsList !== null &&
          listerror == null &&
          (isCreator ? (
            <ListItemEditor
              currentTitle={wordsList.title}
              currentDescription={wordsList.description}
              currentData={wordsList.words}
              listID={params.listId}
            />
          ) : (
            <ListDisplayPage listData={wordsList} />
          ))}
      </div>
      {listerror && (
        <div>
          We cannot find any List. This has been deleted by the creator.
        </div>
      )}
    </div>
  );
}
