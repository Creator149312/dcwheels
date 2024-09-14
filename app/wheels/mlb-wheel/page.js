import WheelWithInput from "@components/WheelWithInput";

let titleStr = "MLB Spin Wheel - Pick Random Team or Player";
let descriptionStr =
  "Explore MLB wheel and spin to pick a random team or player to bet on.";

let segmentsData = [
  "Arizona Diamondbacks",
  "Atlanta Braves",
  "Baltimore Orioles",
  "Boston Red Sox",
  "Chicago White Sox",
  "Chicago Cubs",
  "Cincinnati Reds",
  "Cleveland Indians",
  "Colorado Rockies",
  "Detroit Tigers",
  "Houston Astros",
  "Kansas City Royals",
  "Los Angeles Angels",
  "Los Angeles Dodgers",
  "Miami Marlins",
  "Milwaukee Brewers",
  "Minnesota Twins",
  "New York Yankees",
  "New York Mets",
  "Oakland Athletics",
  "Philadelphia Phillies",
  "Pittsburgh Pirates",
  "San Diego Padres",
  "San Francisco Giants",
  "Seattle Mariners",
  "St. Louis Cardinals",
  "Tampa Bay Rays",
  "Texas Rangers",
  "Toronto Blue Jays",
  "Washington Nationals",
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
            An MLB spin wheel is a fun game where you randomly select an MLB
            team or player. Perfect for baseball fans or just a casual game
            night, it adds an element of surprise and excitement to your MLB
            experience. Spin the wheel and see who you'll draft or which team
            you'll play out of 30 teams.
          </p>
        </div>
      </div>
    </>
  );
}
