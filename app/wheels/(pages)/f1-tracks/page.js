import WheelWithInput from "@components/WheelWithInput";

let titleStr = "F1 Wheel - Pick a Random F1 Track";
let descriptionStr =
  "Explore F1 wheel and spin to pick a random track for your next race.";

let segmentsData = [
  "Monaco Grand Prix",
  "British Grand Prix",
  "Italian Grand Prix",
  "Spanish Grand Prix",
  "French Grand Prix",
  "Azerbaijan Grand Prix",
  "Singapore Grand Prix",
  "Japanese Grand Prix",
  "Australian Grand Prix",
  "Canadian Grand Prix",
  "Hungarian Grand Prix",
  "Belgian Grand Prix",
  "United States Grand Prix",
  "Mexican Grand Prix",
  "Abu Dhabi Grand Prix",
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
            F1 track spin the wheel is a fun and interactive game that can be
            used to decide on a random F1 track for a race or other activity.
          </p>
        </div>
      </div>
    </>
  );
}
