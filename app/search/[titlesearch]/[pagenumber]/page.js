import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";
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
  let end =
    wheelList.length > start + perPage ? start + perPage : wheelList.length;
  for (var i = start; i < end; i++) {
    let item = wheelList[i];

    // console.log("Title of Wheel = ", item.title);
    wheelData.push(
      <a href={`/uwheels/${item._id}`} key={i}>
        <Card
          className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800 
               hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 
               transition-all duration-300 ease-in-out 
               focus:outline-none focus:ring-2 focus:ring-blue-500"
          tabIndex={0} // for keyboard accessibility
        >
          <div className="text-base leading-normal flex justify-between items-center">
            <div className="w-[80%]">
              <h2 className="font-medium mb-1">{item.title}</h2>
            </div>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full font-semibold">
              {item.data.length}
            </span>
          </div>
        </Card>
      </a>
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
    <div className="m-3 p-3">
      <div className="bg-card text-card-foreground w-full">
        {/* <SearchBarNav /> */}
        <h1 className="text-xl font-semibold mb-2">
          Search Results: {searchtitle}
        </h1>
      </div>
      <div className="mb-4">
        {wordsList !== null &&
          listerror == null &&
          wordsList.length > 0 &&
          printSearchData(wordsList).map((item, index) => item)}
        {listerror && (
          <div>
            We cant find the list. This has been deleted by the creator.
          </div>
        )}
      </div>
      <BottomPagination
        data={wordsList}
        perPage={perPage}
        searchValue={searchtitle}
        pagenumber={params.pagenumber}
      />
    </div>
  );
}
