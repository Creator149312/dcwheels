import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Yes or No Decision Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random yes or no choice.";

let segmentsData = ["Yes", "No", "Yes", "No", "Yes", "No", "Yes", "No"];

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
            Yes or No Wheel is a virtual tool designed to assist you in making
            quick and accurate decisions. This decision picker consists of a
            circular wheel divided into segments marked “Yes” and “No.”
          </p>
          <p className="mb-3">
            By simply clicking to spin the wheel, it will randomly stop at a
            segment, providing a prediction to your yes or no question.
          </p>
          <p className="mb-3">
            Additionally, you can choose to add a “Maybe” option to the wheel,
            offering more nuanced choices. This tool is perfect for those
            moments when you need a little help making a choice.
          </p>
        </div>
      </div>
    </>
  );
}
