import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Category Wheel - Random Categories Picker";
let descriptionStr =
  "Explore category spinner and spin to pick a random category from the list.";

let segmentsData = [
  "Animals",
  "Food",
  "Colors",
  "Sports",
  "Countries",
  "Movies",
  "Hobbies",
  "Books",
  "Music",
  "Technology",
  "Nature",
  "Vehicles",
  "Clothes",
  "Occupations",
  "Holidays",
  "Seasons",
  "Cities",
  "Languages",
  "Planets",
  "Emotions",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      <WheelWithInput newSegments={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            A category picker wheel is a circular interface that allows users to
            quickly and easily select a category from a list. The wheel
            typically features a central pointer that can be rotated to select a
            category from the surrounding options.
          </p>
          <p className="mb-3">
            Each category is displayed as a label or icon around the wheel&#39;s
            circumference. This design provides a compact and intuitive way for
            users to navigate through and choose their preferred category.
          </p>
        </div>
      </div>
    </>
  );
}
