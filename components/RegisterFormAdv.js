"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@utils/Validator";
import { registerUser } from "@components/actions/actions"
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export default function RegisterFormAdv() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
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

    let vu = validateUsername(formData.username);
    let ve = validateEmail(formData.email);
    let vp = validatePassword(formData.password);

    if (vu.length !== 0) errors.username = vu;
    if (ve.length !== 0) errors.email = ve;
    if (vp.length !== 0) errors.password = vp;

    if (Object.keys(errors).length === 0) {
      setIsRegistering(true);
      try {
        console.log("Form Data in Client, ", dataFromFrom);
        let results = await registerUser(dataFromFrom);

        if (results?.error) {
          toast.error(results.error);
        } else {
          toast.success("Verification Email Sent, Please Verify!");
          setFormData({
            username: "",
            email: "",
            password: "",
          });
        }
      } catch (error) {
        setError("Registration Failed!");
      } finally {
        setIsRegistering(false);
      }
    } else {
      setErrors(errors);
    }
  };

  return (
    <Card className="text-center max-w-md mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Register</h1>
        <form action={validateFormAdv} className="max-w-md mx-auto p-4">
          <div>
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              className="w-full p-2 text-base border border-gray-300 rounded-sm mt-2 mb-3"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />
            {errors.username && <p className="error">{errors.username}</p>}
          </div>
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
          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              className="w-full p-2 text-base border border-gray-300 rounded-sm mt-2 mb-3"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="error">{errors.password}</p>}
          </div>
          <Button size={"lg"} variant={"default"} className="p-3">Register</Button>
          {/* {error && <Notification message={error} state={"failed"} />} */}
          {isRegistering && (
            <p>Checking Details and Creating Your Account...</p>
          )}
          <div className="p-2">
          <Link className="text-sm mt-3 text-right" href={"/login"}>
            Already have an account? <span className="underline">Login</span>
          </Link>
          </div>
        </form>
      </Card>

  );
}
