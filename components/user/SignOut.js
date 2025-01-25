import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

const SignOut = () => {
  const handleSignOut = async (e) => {
    try {
      e.preventDefault();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      toast.error("Sign-out failed");
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
