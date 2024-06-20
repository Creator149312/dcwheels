// components/SignIn.js
import { signIn } from 'next-auth/react';

const SignIn = () => {
  const handleSignIn = (e) => {
    e.preventDefault();
    signIn();
  };

  return (
    <a href="#" onClick={handleSignIn}>Sign in</a>
  );
};

export default SignIn;
