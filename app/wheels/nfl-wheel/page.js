import WheelWithInput from "@components/WheelWithInput";

let titleStr = "NFL Teams Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random team from NFL league.";

let segmentsData = [
  "Arizona Cardinals",
  "Atlanta Falcons",
  "Baltimore Ravens",
  "Buffalo Bills",
  "Carolina Panthers",
  "Chicago Bears",
  "Cincinnati Bengals",
  "Cleveland Browns",
  "Dallas Cowboys",
  "Denver Broncos",
  "Detroit Lions",
  "Green Bay Packers",
  "Houston Texans",
  "Indianapolis Colts",
  "Jacksonville Jaguars",
  "Kansas City Chiefs",
  "Las Vegas Raiders",
  "Los Angeles Chargers",
  "Los Angeles Rams",
  "Miami Dolphins",
  "Minnesota Vikings",
  "New England Patriots",
  "New Orleans Saints",
  "New York Giants",
  "New York Jets",
  "Philadelphia Eagles",
  "Pittsburgh Steelers",
  "San Francisco 49ers",
  "Seattle Seahawks",
  "Tampa Bay Buccaneers",
  "Tennessee Titans",
  "Washington Commanders",
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
            The NFL Teams Picker Wheel features a spinning wheel with all 32 NFL
            teams. Simply spin the wheel to randomly select a team for your bet.
            It is a fun and unpredictable way to choose your bets, adding a new
            dimension to the excitement of NFL wagering, especially during the
            NFL playoffs.
          </p>
          <p>
            NFL wheel spinners are widely used in online fantasy football
            games and other similar games where a random
            selection of a team is needed. They are convenient and can save a
            lot of time compared to the physical spinner, as the user does not
            have to physically spin the wheel.
          </p>
        </div>
      </div>
    </>
  );
}
