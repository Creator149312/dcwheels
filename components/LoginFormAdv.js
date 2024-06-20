"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import SignInBtn from "@components/SignInBtn"
import Notification from "@components/Notification"
import { validateEmail, validatePasswordLength } from "@utils/Validator";

export default function LoginFormAdv() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const router = useRouter();

  // whenever input changes in input fields 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    //clear errors when user is typing
    setErrors({ ...errors, [name]: "" });
    setError("");
  };

  const validateForm = (data) => {
    let err = {};

    let ve = validateEmail(data.email);
    let vp = validatePasswordLength(data.password);

    if(ve.length !== 0) err.email = ve;
    if(vp.length !== 0) err.password = vp;
    
    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length === 0) {
      setIsSigning(true);
      setError("");
      try {
        const res = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (res.error) {
          setError("Invalid Credentials");
          return;
        }

        console.log("Login done redirecting to Dashboard");

        router.replace("dashboard");
      } catch (error) {
        setError(error);
      } finally {
        setIsSigning(false);
      }
    } else {
      setErrors(validationErrors);
    }
  };

  return (
    <div className="text-center">
      <div className="card form-50">
        <h1 className="card-title mb-2">Login</h1>
        <form onSubmit={handleSubmit} className="card-content ">
          <div>
            <label htmlFor="email">Email Address:</label>
            <input
              type="email"
              id="email"
              className="form-control mt-2 mb-3"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control mt-2 mb-2"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {errors.password && <p className="error">{errors.password}</p>}
            <div>
            <Link className="m-4 p-3" href={"/reset-password"}>
              Forgot password
            </Link>
            </div>
          </div>
          <div className="">
            <button className="custom-button m-3">Login</button>
          </div>
          {isSigning && <p>Checking Your Credentials....</p>}
          {error && (
            <Notification
              message={"Username or Password is incorrect..."}
              state={"failed"}
            />
          )}
          <div className="">
            <Link className="m-4 p-3" href={"/register"}>
              Don't have an account? <span className="underline">Register</span>
            </Link>
          </div>
        </form>
        <div className="">
          <SignInBtn />
        </div>
      </div>
    </div>
  );
}
