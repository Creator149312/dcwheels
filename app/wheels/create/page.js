import Link from "next/link";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";

// Wheel creation page - static to keep the rendered shell at the CDN edge
export const dynamic = "force-static";
export const revalidate = false;

export default async function CreateWheel() {
  return (
    <div className="mx-auto">
      <WheelWithInputContentEditable
        newSegments={[
          { text: "Gabriel", weight: 1, visible: true },
          {
            text: "Hanna",
            weight: 1,
            visible: true,
            message: "Where are you going my bro?",
          },
          {
            text: "or try new",
            weight: 1,
            visible: true,
            message: "What is your name my friend?",
          },
          { text: "Daniel", weight: 1, visible: true },
          { text: "Ram", weight: 1, visible: true },
        ]}
        relatedWheelsSlot={<div />}
      />
      <div className="blog-main mt-4 p-3">
        <h1 className="text-4xl mb-2">
          Create Your Spin Wheel – Fun Random Decision Picker
        </h1>
        <p className="mb-3">
          Spin Wheel is an online spinner tool designed to help people make
          choices in a lighthearted and engaging way. It's a virtual wheel you
          can spin to land on a random option. The wheel is divided into
          sections, each with a different choice, and the result is simply
          whichever section the wheel stops on.
        </p>
        <p className="mb-4">
          You can use this decision wheel for anything — from picking what to
          eat for dinner, choosing a vacation spot, or deciding which movie to
          watch, to making group activities more fun. It's also great for
          friendly contests, classroom activities, or community events where you
          want to pick someone or something at random in a fair and transparent
          way.
        </p>
        <p className="mb-4">
          Perfect for team-building, icebreakers, or just adding a bit of fun to
          everyday decisions — all without any connection to gambling or
          betting.
        </p>
        <h2 className="text-3xl mb-2">
          Why Use a Picker Wheel for Your Decisions?
        </h2>
        <p className="mb-3">
          The picker wheel is simple, intuitive, and requires no technical
          skills. Just enter your options, give the wheel a spin, and let it
          land on a random choice. Because the result is generated without bias,
          it is a fair and impartial way to decide between multiple
          possibilities.
        </p>
        <p className="mb-3">
          One of its biggest advantages is that it takes the pressure off
          decision‑making. Instead of overthinking or weighing every pro and
          con, you can let the wheel make the call — reducing stress and making
          the process more enjoyable. This is especially helpful for people who
          find it hard to choose or who simply want a light‑hearted, interactive
          way to decide.
        </p>
        <p className="mb-3">
          It's also a great way to add energy to any setting. The act of
          spinning the wheel builds anticipation, and the reveal is always a
          surprise. Whether you're picking a dinner spot, choosing a team
          activity, or deciding the next speaker in a meeting, the picker wheel
          turns everyday decisions into a fun, shared experience.
        </p>
        <p className="mb-5">
          Overall, the spin wheel is a versatile tool that works in countless
          scenarios — from casual personal choices to group activities — making
          it a handy and entertaining addition to your toolkit.
        </p>
        <h2 className="text-3xl mb-2">How to Use the Spinner</h2>
        <p className="mb-2">Follow these simple steps to get started:</p>

        <p className="mb-3">
          1. <strong>Update the Wheel:</strong> Type each option into the
          editable text area — one option per line. Each line becomes a separate
          segment on the wheel.
        </p>

        <p className="mb-3">
          2. <strong>Create a New Wheel:</strong> Clear all existing entries to
          start fresh. This gives you a blank wheel with no segments, ready for
          your custom options.
        </p>

        <p className="mb-3">
          3. <strong>Spin the Wheel:</strong> Once you've entered your options,
          click the "Spin" button to give the wheel a spin. The result will be
          displayed when the wheel stops spinning.
        </p>

        <p className="mb-4">
          4. <strong>Share Your Wheel:</strong> Once you've created a wheel you
          like, save it to your account and share the link with friends or
          colleagues.
        </p>
      </div>
    </div>
  );
}
