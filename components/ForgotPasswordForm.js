"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateEmail } from "@utils/Validator";
import { generatePasswordResetLink } from "@components/actions/actions";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { FormSubmitButton } from "./FormSubmitButton";

export default function ForgotPasswordForm() {
  const [formData, setFormData] = useState({
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    //we are setting all errors to empty when user is typing
    setErrors({ ...errors, [name]: "" });
    setError("");
  };

  const validateFormAdv = async (dataFromFrom) => {
    let errors = {};
    setErrors({});
    setError("");

    let ve = validateEmail(formData.email);

    if (ve.length !== 0) errors.email = ve;

    if (Object.keys(errors).length === 0) {
      setIsRegistering(true);
      try {
        let results = await generatePasswordResetLink(dataFromFrom);

        if (results?.error) {
          toast.error(results.error);
        } else {
          toast.success("Password Reset Email Sent, Please Verify!");
          setFormData({
            username: "",
            email: "",
            password: "",
          });
        }
      } catch (error) {
        setError("Request Failed!");
      } finally {
        setIsRegistering(false);
      }
    } else {
      setErrors(errors);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="text-center max-w-md mx-auto p-4 ">
        <h1 className="text-3xl font-bold mb-4 text-center">Forgot Password</h1>
        <form action={validateFormAdv} className="max-w-md mx-auto p-4">
          <div>
            <label htmlFor="email">Email Address:</label>
            <input
              type="email"
              id="email"
              className="w-full p-2 text-base border border-gray-300 rounded-sm mt-2 mb-3"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>

          {/* <Button
            size={"lg"}
            variant={"default"}
            className={`p-3 ${
              isRegistering ? "cursor-not-allowed opacity-50" : ""
            }`}
            disabled={isRegistering}
          >
            {isRegistering ? "Checking and Sending..." : "Get Reset Link"}
          </Button> */}
          {/* {error && <Notification message={error} state={"failed"} />} */}
          {isRegistering && (
            <p>Checking Details and Creating Your Account...</p>
          )}
          <FormSubmitButton
            btnTxt={"Get Reset Link"}
            btnTxtDisabled={"Checking Details..."}
          />
        </form>
      </Card>
    </div>
  );
}
