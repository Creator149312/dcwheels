import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Months Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random month of the year.";

let segmentsData = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
            Months Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the exploration of time and
            seasons. Players spin the wheel which is divided into 12 sections
            representing each month of the year. The outcome of the spin reveals
            a fun fact or trivia about the month.
          </p>
        </div>
      </div>
    </>
  );
}
