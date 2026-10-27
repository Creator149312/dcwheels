export const metadata = {
  title: "Privacy Policy – SpinPapa",
  description:
    "Learn how SpinPapa collects, uses, and safeguards information across our decision-making and community discussion platform.",
};

export default function Page() {
  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-foreground">
      <div className="mb-8 border-b border-border/60 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Last updated: October 2026 • SpinPapa.com
        </p>
      </div>

      <div className="space-y-8 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <p>
            At SpinPapa (<strong className="text-foreground">“we,” “our,” or “us”</strong>), we respect your privacy. This Privacy Policy describes how we handle information across our community decision-making and social discussion platform, accessible at <span className="text-foreground font-medium">spinpapa.com</span>.
          </p>
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs sm:text-sm">
            <strong className="text-foreground">Important Note on Service Type:</strong> SpinPapa is a social community tool for discussing ideas, voting on dilemmatic choices, and creating interactive picker wheels for everyday choices (like movies, books, and study plans). We do not offer or facilitate gambling, monetary wagers, lotteries, or real-money gaming of any sort.
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Account Information:</strong> When you register an account, we may collect your username, email address, password hash, and optional profile avatar.
            </li>
            <li>
              <strong className="text-foreground">Community & User Content:</strong> Content you willingly publish, including custom decision wheels, poll votes, dilemma questions, curated lists, comments, ratings, and reactions.
            </li>
            <li>
              <strong className="text-foreground">Usage & Device Information:</strong> Technical data such as your IP address, browser type, device details, referring URLs, and page interactions, used to maintain performance, security, and responsive layouts across mobile and desktop.
            </li>
            <li>
              <strong className="text-foreground">Cookies & Local Storage:</strong> We use session tokens, local preferences (such as dark/light theme, volume settings, and recent choices), and analytics cookies to enhance site functionality.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. How We Use Your Information</h2>
          <p>We use the collected information exclusively to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Provide, maintain, and optimize platform features (such as saving custom wheels, managing discussions, and recording poll tallies).</li>
            <li>Enable social interactions, profile management, and community notifications.</li>
            <li>Analyze aggregate usage trends to improve page load speed, UX responsiveness, and content relevance.</li>
            <li>Detect and prevent spam, malicious bot activity, unauthorized access, or abuse of our terms.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">3. Information Sharing & Third Parties</h2>
          <p>
            We do not sell, rent, or trade your personal information. We only share information in the following limited circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Public Content:</strong> Wheels, dilemmas, lists, and comments you choose to make public are viewable by other visitors across the community.
            </li>
            <li>
              <strong className="text-foreground">Trusted Service Providers:</strong> Secure cloud infrastructure, database hosting, email verification services, and privacy-conscious analytics tools acting on our behalf under confidentiality obligations.
            </li>
            <li>
              <strong className="text-foreground">Legal Compliance:</strong> If required by law, subpoena, or to protect the safety, rights, and security of our users and platform.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. Data Security & Storage</h2>
          <p>
            We implement industry-standard encryption and security measures to protect your account details and stored content. However, please remember that no Internet transmission or electronic storage system is 100% impenetrable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">5. Your Rights & Choices</h2>
          <p>You have full control over your data on SpinPapa:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You can edit or delete wheels, lists, posts, and comments you have created.</li>
            <li>You can update your profile handle or display details at any time.</li>
            <li>You can request account deletion or data exports by contacting our support team.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">6. Contact Us</h2>
          <p>
            If you have questions or privacy concerns regarding this policy, please reach out to us at <span className="text-foreground font-medium">support@spinpapa.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
