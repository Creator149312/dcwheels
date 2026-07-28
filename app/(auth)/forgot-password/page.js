import ForgotPasswordForm from "@components/ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password",
  description:
    "Forgot your password? No problem! Enter your email address and we'll send you a link to reset it.",
};

function Page() {
  return (
   <ForgotPasswordForm />
  );
}

export default Page;