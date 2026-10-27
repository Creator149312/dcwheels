export const metadata = {
  title: "F.A.Q & Help – SpinPapa",
  description:
    "Frequently asked questions about creating decision wheels, discussing dilemmas, and making choices with the SpinPapa community.",
};

export default function Page() {
  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-foreground">
      <div className="mb-8 border-b border-border/60 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Everything you need to know about discussing choices, using decision wheels, and sharing with the SpinPapa community.
        </p>
      </div>

      <div className="space-y-6 text-sm sm:text-base">
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            What is SpinPapa?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            SpinPapa is a social platform for fandoms, creators, and communities to discuss dilemmas, vote on options, and decide choices. Whether you are figuring out what to watch next, picking characters for a tier list, or choosing a board game, SpinPapa combines interactive decision wheels with lively community debate.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Is SpinPapa a gambling or betting site?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">No, absolutely not.</strong> SpinPapa has zero association with gambling, real-money wagering, lotteries, or betting. Our wheels are creative decision-making and productivity tools designed solely to pick among user-entered text labels (such as dinner recipes, study tasks, video games, or anime series).
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            How do I create and customize a decision wheel?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Head to the <strong className="text-foreground">Create Wheel</strong> page or open the wheel editor. Type your options into the segment inputs, choose colors or icons, and customize your settings. Once saved, you can spin it, embed it on your website, or share the link with friends.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            What are Community Dilemmas & Polls?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            When you need genuine community feedback, you can create a Dilemma post. Community members can vote instantly on your choices, discuss pros and cons in the comments, and share perspectives to help you reach a well-informed decision.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Is SpinPapa free to use?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Yes, SpinPapa is 100% free to use for creating wheels, spinning, tracking titles, voting on polls, and sharing with friends.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Can I use SpinPapa on mobile devices?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Yes. SpinPapa is fully responsive and installable as a progressive web app (PWA) across iOS, Android, tablets, and desktop computers.
          </p>
        </div>
      </div>
    </div>
  );
}
