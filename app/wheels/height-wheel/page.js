import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Height Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random height.";

let segmentsData = [
  "Short",
  "Average",
  "Tall",
  "Very Tall",
  "Short",
  "Average",
  "Tall",
  "Very Tall",
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
            Height Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the exploration of height.
            Players spin the wheel which is divided into sections representing
            different height categories.
          </p>
        </div>
      </div>
    </>
  );
}
