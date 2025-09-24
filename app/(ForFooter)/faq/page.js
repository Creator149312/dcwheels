export default function Page() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">F.A.Q / Help</h1>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        Welcome to the SpinPapa Help Center. Here you will find answers to common questions about using our wheel spinner, creating custom wheels, sharing results, and more.
      </p>
      <ul className="list-disc pl-6 space-y-4 text-gray-600 dark:text-gray-400">
        <li>
          <p className="font-semibold">How do I create a custom wheel?</p>
          <p className="ml-4">
            Go to the “Create Wheel” page, add your choices into the input fields,
            and customize the colors or labels. Once done, save your wheel to use it anytime.
          </p>
        </li>

        <li>
          <p className="font-semibold">Can I save or share my spins?</p>
          <p className="ml-4">
            Yes. After spinning, you can save the results to your account or share
            them directly with friends using a link or social media.
          </p>
        </li>

        <li>
          <p className="font-semibold">Is SpinPapa free to use?</p>
          <p className="ml-4">
            Absolutely. All the core features like spinning, creating wheels, and sharing
            are free. Some advanced options may be added later as premium features.
          </p>
        </li>

        <li>
          <p className="font-semibold">How does the random picker work?</p>
          <p className="ml-4">
            The wheel uses a random number generator to ensure each choice has an equal
            chance of being selected. Every spin is fair and unbiased.
          </p>
        </li>

        <li>
          <p className="font-semibold">Can I use SpinPapa on mobile?</p>
          <p className="ml-4">
            Yes. SpinPapa is fully responsive and works on phones, tablets, and desktops.
            You can spin, create, and share wheels from any device.
          </p>
        </li>
      </ul>
    </div>
  );
}
