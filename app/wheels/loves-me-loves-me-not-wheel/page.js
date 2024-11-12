import WheelWithInput from "@components/WheelWithInput";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";

let titleStr = "Loves Me Loves Me Not Wheel";
let descriptionStr =
  "Explore Age wheel and spin to pick a random age group for a task.";

let segmentsData = [
  "Loves Me",
  "Loves Me Not",
  "Loves Me",
  "Loves Me Not",
  "Loves Me",
  "Loves Me Not",
  "Loves Me",
  "Loves Me Not",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      <WheelWithInputContentEditable segTempData={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            An age spin wheel is a fun and interactive tool that can be used for
            various purposes. It is a circular board with different ages written
            on it, allowing you to randomly select an age. Whether you are
            playing a game, making a random decision, or simply looking for a
            fun way to pass the time, an age spin wheel can provide a unique and
            entertaining experience.
          </p>
        </div>
      </div>
    </>
  );
}
