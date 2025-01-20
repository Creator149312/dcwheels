"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validatePassword } from "@utils/Validator";
import { updateNewPasswordbyToken } from "@components/actions/actions";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useSearchParams } from "next/navigation";
import { FormSubmitButton } from "./FormSubmitButton";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    retypeNewPassword: "",
    newPassword: "",
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

    let vnp = validatePassword(formData.newPassword);
    let vtp = validatePassword(formData.retypeNewPassword);

    if (vnp.length !== 0) errors.newPassword = vnp;
    if (vtp.length !== 0) errors.retypeNewPassword = vtp;

    if (Object.keys(errors).length === 0) {
      setIsRegistering(true);
      try {
        let results = await updateNewPasswordbyToken(dataFromFrom, token);

        if (results?.error) {
          toast.error(results.error);
        } else {
          toast.success("Password successfully changed!");
          setFormData({
            retypeNewPassword: "",
            newPassword: "",
          });
          router.push("/login");
        }
      } catch (error) {
        setError("Password Reset Failed!");
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
        <h1 className="text-3xl font-bold mb-4 text-center">Update Password</h1>
        <form action={validateFormAdv} className="max-w-md mx-auto p-4">
          <div>
            <label htmlFor="newPassword">New Password:</label>
            <input
              type="password"
              id="newPassword"
              className="w-full p-2 text-base border border-gray-300 rounded-sm mt-2 mb-3"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
            />
            {errors.newPassword && (
              <p className="error">{errors.newPassword}</p>
            )}
          </div>
          <div>
            <label htmlFor="retypeNewPassword">Retype Password:</label>
            <input
              type="password"
              id="retypeNewPassword"
              name="retypeNewPassword"
              className="w-full p-2 text-base border border-gray-300 rounded-sm mt-2 mb-3"
              value={formData.retypeNewPassword}
              onChange={handleChange}
            />
            {errors.retypeNewPassword && (
              <p className="error">{errors.retypeNewPassword}</p>
            )}
          </div>
          {/* <Button
            size={"lg"}
            variant={"default"}
            className={`p-3 ${
              isRegistering ? "cursor-not-allowed opacity-50" : ""
            }`}
            disabled={isRegistering}
          >
            {isRegistering ? "Updating Password..." : "Update Password"}
          </Button> */}
          <FormSubmitButton
            btnTxt={"Update Password"}
            btnTxtDisabled={"Updating Password.."}
          />
          {/* {error && <Notification message={error} state={"failed"} />} */}
          {isRegistering && (
            <p>Checking Details and Creating Your Account...</p>
          )}
        </form>
      </Card>
    </div>
  );
}
