import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Relationship Spin Wheel";
let descriptionStr =
  "Explore relationship wheel and spin to pick a random relation.";

let segmentsData = [
  "Parent-child: The most fundamental relationship, involving the bond between a parent and their child.",
  "Sibling: The relationship between brothers and sisters.",
  "Grandparent-grandchild: The relationship between grandparents and their grandchildren.",
  "Aunt-uncle: The relationship between a parent's sibling and their nieces or nephews.",
  "Cousin: The relationship between children of siblings.",
  "In-law: The relationship between a spouse's relatives and their own family members.",
  "Step-sibling: The relationship between children who share a parent but not both.",
  "Adoptive family: The relationship between adoptive parents and their adopted children.",
  "Friendship: A close relationship between two or more people who share common interests or goals.",
  "Romantic relationship: A relationship involving strong feelings of attraction and affection.",
  "Marriage: A legal union between two people.",
  "Partnership: A relationship involving two or more people working together towards a common goal.",
  "Mentorship: A relationship between a more experienced person who guides and supports a less experienced person.",
  "Colleagues: The relationship between people who work together in the same company or organization.",
  "Neighbors: The relationship between people who live near each other.",
  "Classmates: The relationship between students who attend the same school.",
  "Teammates: The relationship between people who play on the same team or participate in the same activity.",
  "Community members: The relationship between people who live in the same community.",
  "Teacher-student: The relationship between a teacher and their students.",
  "Fiancé/fiancée: A person who is engaged to be married.",
  "Ex-partner: A former romantic partner.",
  "Roommate: A person who shares a living space with another person.",
  "Mentor-mentee: A relationship between a more experienced person who guides and supports a less experienced person.",
  "Coach-athlete: A relationship between a coach and their athlete.",
  "Employer-employee: A relationship between an employer and their employee.",
  "Pet owner-pet: The relationship between a person and their pet.",
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
            A relationship spin wheel is a fun and interactive tool that can be
            used to explore different types of relationships in a family or with
            outside world. It is a circular board with various relationship types
            written on it, allowing you to randomly select one.
          </p>
          <p className="mb-3">
            Whether you are playing a game, making a random decision, or simply
            looking for a new perspective on relationships, a relationship spin
            wheel can provide a unique and entertaining experience.
          </p>
        </div>
      </div>
    </>
  );
}
