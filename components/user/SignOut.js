// components/SignOut.js
import { signOut } from "next-auth/react";


const SignOut = () => {
  const handleSignOut = async (e) => {
    try {
      e.preventDefault();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign-out failed:", error);
      // Handle the error, e.g., display an error message to the user
    }
  };

  return (
    <a href="#" onClick={handleSignOut}>
      Sign Out
    </a>
  );
};

export default SignOut;
