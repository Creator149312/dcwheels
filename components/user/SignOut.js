// components/SignOut.js
import { signOut } from 'next-auth/react';

const SignOut = () => {
  const handleSignOut = async (e) => {
    e.preventDefault();
    await signOut({ redirect: false });
  };

  return (
    <a href="#" onClick={handleSignOut}>Sign out</a>
  );
};

export default SignOut;
