import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Fruit Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random fruit.";

let segmentsData = [
  "Apple",
  "Banana",
  "Orange",
  "Grape",
  "Strawberry",
  "Blueberry",
  "Raspberry",
  "Kiwi",
  "Pineapple",
  "Mango",
  "Watermelon",
  "Avocado",
  "Cherry",
  "Peach",
  "Pear",
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
            Fruit Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the deliciousness of fruits.
            Players spin the wheel which is divided into sections representing
            various fruits. The outcome of the spin reveals a fun fact or trivia
            about the fruit.
          </p>
        </div>
      </div>
    </>
  );
}
