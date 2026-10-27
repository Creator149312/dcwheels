export const metadata = {
  title: "Terms of Service – SpinPapa",
  description:
    "Review terms and conditions for using SpinPapa, the community discussion and choice-making platform.",
};

export default function Page() {
  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-foreground">
      <div className="mb-8 border-b border-border/60 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Terms & Conditions
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Last updated: October 2026 • SpinPapa.com
        </p>
      </div>

      <div className="space-y-8 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <p>
            Welcome to SpinPapa. By accessing or using our website, services, and applications (<strong className="text-foreground">“SpinPapa,” “the Platform”</strong>), you agree to comply with and be bound by these Terms & Conditions.
          </p>
        </section>

        <section className="space-y-3 p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60">
          <h2 className="text-lg font-bold text-foreground">1. Non-Gambling & Social Choice Utility Disclosure</h2>
          <p className="text-xs sm:text-sm">
            SpinPapa is strictly an entertainment, discussion, and decision-assistance platform. SpinPapa does not provide, encourage, facilitate, or tolerate gambling, sportsbook activities, raffles, lotteries, or real-money wagering. Any wheels, random selectors, or voting mechanisms provided are recreational organizational tools intended for personal and group choices (e.g. study prompts, creative brainstorming, food selection, fandom debates).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. User Accounts & Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You are responsible for keeping your account credentials secure.</li>
            <li>You agree to provide accurate information when registering and to keep it updated.</li>
            <li>You may not use the Platform for unauthorized automated scraping, disruption, denial-of-service, or abusive conduct.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">3. Community Conduct & User Content</h2>
          <p>
            SpinPapa encourages constructive discussions, polls, and creative wheel sharing. When publishing wheels, dilemmas, lists, or comments:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>You retain ownership of the original text, lists, and content you create. By making it public, you grant SpinPapa a non-exclusive license to display and distribute it within the platform.</li>
            <li>You must not post hate speech, harassment, sexually explicit content, deceptive promotions, or illegal material.</li>
            <li>You must not publish content promoting real-money gambling, illegal betting pools, or financial schemes.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. Intellectual Property</h2>
          <p>
            All logos, visual branding, software, designs, and platform interfaces are the property of SpinPapa and protected by copyright, trademark, and other applicable laws. Third-party titles, posters, and trademarks (such as anime, movie, or game titles) are referenced strictly for educational, review, editorial, and discussion purposes under fair use.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">5. Disclaimer of Warranties & Limitation of Liability</h2>
          <p>
            The platform is provided on an “as is” and “as available” basis. SpinPapa makes no guarantees that the service will be uninterrupted or error-free. Decision results and wheel selections are randomly generated for casual entertainment and informational purposes only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">6. Modifications to Terms</h2>
          <p>
            We may revise these Terms from time to time. Continued use of SpinPapa after any modifications signifies your acceptance of the updated terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">7. Contact Information</h2>
          <p>
            For inquiries regarding our terms, please contact us at <span className="text-foreground font-medium">support@spinpapa.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
