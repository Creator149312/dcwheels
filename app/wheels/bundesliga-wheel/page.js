import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Bundesliga Spin Wheel - Pick Random Team or Player";
let descriptionStr =
  "Explore Bundesliga wheel and spin to pick a random team or player to bet on.";

let segmentsData = [
  "Bayern Munich",
  "Borussia Dortmund",
  "RB Leipzig",
  "Union Berlin",
  "Freiburg",
  "Eintracht Frankfurt",
  "Bayer Leverkusen",
  "Wolfsburg",
  "Hoffenheim",
  "Mainz 05",
  "Stuttgart",
  "Augsburg",
  "Hertha BSC",
  "Schalke 04",
  "Bochum",
  "Werder Bremen",
  "FC Köln",
  "Mönchengladbach",
  "Heidenheim",
  "Hamburger SV",
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
            A Bundesliga spin wheel is a fun game where you randomly select a
            Bundesliga team or player. Perfect for football fans or just a
            casual game night, it adds an element of surprise and excitement to
            your Bundesliga experience. Spin the wheel and see who you'll draft
            or which team you'll play.
          </p>
        </div>
      </div>
    </>
  );
}
