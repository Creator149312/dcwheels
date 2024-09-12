import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Zodiac Picker Wheel";
let descriptionStr = "Explore " + titleStr + " and spin to pick a random zodiac sign.";

let segmentsData = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
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
            Zodiac Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the intrigue of astrology.
            Players spin the wheel which is divided into 12 sections
            representing each zodiac sign.
          </p>
        </div>
      </div>
    </>
  );
}
