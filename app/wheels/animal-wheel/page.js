import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Animal Picker Wheel";
let descriptionStr =
  "Explore " +
  titleStr +
  " and spin to pick a random animal to adopt as pet or see.";

let segmentsData = [
  "Dog",
  "Cat",
  "Rabbit",
  "Horse",
  "Bear",
  "Lion",
  "Tiger",
  "Elephant",
  "Giraffe",
  "Zebra",
  "Monkey",
  "Deer",
  "Fox",
  "Wolf",
  "Kangaroo",
  "Panda",
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
            Animal Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the fascination of the animal
            kingdom. Players spin the wheel which is divided into sections
            representing various animals.
          </p>
        </div>
      </div>
    </>
  );
}
