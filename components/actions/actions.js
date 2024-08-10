"use server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@lib/mongodb";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";
import EmailVerificationToken from "@models/emailverificationtoken";
import PasswordReset from "@models/passwordreset";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  validatePassword,
  validateUsername,
  validateEmail,
} from "@utils/Validator";
import Wheel from "@models/wheel";
import { Resend } from "resend";
import Registration from "@app/email/registration";
import uuid4 from "uuid4";

const resend = new Resend(process.env.EMAIL_API_KEY);

export const updateNewPassword = async (formData) => {
  let errorData = { error: "" };
  const session = await getServerSession(authOptions);

  errorData.error = validatePassword(formData.get("currentPassword"));
  errorData.error = validatePassword(formData.get("newPassword"));
  errorData.error = validatePassword(formData.get("retypeNewPassword"));

  if (formData.get("newPassword") !== formData.get("retypeNewPassword"))
    errorData.error = "Passwords do not match";

  if (errorData.error.length !== 0) {
    console.log("Found Errors");
    return errorData;
  }
  let ifPasswordsMatch = false;
  try {
    if (session && errorData.error.length === 0) {
      await connectMongoDB();
      const userData = await User.find({ email: session.user.email });

      ifPasswordsMatch = await bcrypt.compare(
        formData.get("currentPassword"),
        userData[0].password
      );
      const newhashedPassword = await bcrypt.hash(
        formData.get("newPassword"),
        10
      );

      if (ifPasswordsMatch) {
        const filter = { email: session.user.email };
        const update = { password: newhashedPassword };
        await User.findOneAndUpdate(filter, update);
      } else {
        return {
          error: "Please enter the correct Password!",
        };
      }
    } else {
      //send error message to client
      return {
        error: "Please login to change Password!",
      };
    }
  } catch (error) {
    return { error: "Error resetting password" };
  }

  // if (ifPasswordsMatch) {
  //   redirect("/login");
  // }
};

// export const getWheelsByTitle = async (titleSearch) =>{
//   try {
//     // Find Wheels with matching title using async/await
//     const books = await Wheel.find({ title: titleSearch });
//     console.log("Found books:", books);
//   } catch (err) {
//     console.error("Error finding books:", err);
//   }
// }

export const updateNewPasswordbyToken = async (formData, token) => {
  let errorData = { error: "" };

  let record = await PasswordReset.findOne({ token });

  console.log(record.email);

  errorData.error = validatePassword(formData.get("newPassword"));
  errorData.error = validatePassword(formData.get("retypeNewPassword"));

  if (formData.get("newPassword") !== formData.get("retypeNewPassword"))
    errorData.error = "Passwords do not match";

  if (errorData.error.length !== 0) {
    console.log("Found Errors");
    return errorData;
  }

  try {
    if (errorData.error.length === 0) {
      await connectMongoDB();

      const newhashedPassword = await bcrypt.hash(
        formData.get("newPassword"),
        10
      );

      const filter = { email: record.email };
      const update = { password: newhashedPassword };
      await User.findOneAndUpdate(filter, update);
    } else {
      //send error message to client
      return {
        error: "Please login to change Password!",
      };
    }
  } catch (error) {
    return { error: "Error resetting password" };
  }

  // if (ifPasswordsMatch) {
  //   redirect("/login");
  // }
};

export const deleteUserAccount = async (formData) => {
  const session = await getServerSession(authOptions);
  try {
    if (session) {
      //delete user record from database
      const result = await User.deleteOne({ email: session.user.email });
      //  console.log(result); // Log the result of the delete operation
    }
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }

  // if (isUserDeleted) {
  //   redirect("/login");
  // }
};

// const validateRegistrationForm = (formData) => {

//   console.log("Error Validation in Server ", errorData);
//   return errorData;
// };

const getVerificationTokenByEmail = async (email) => {
  try {
    const result = await EmailVerificationToken.findOne({ email: email });
    console.log(result); // Log the result of the delete operation
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }
};

const deleteExistingTokenByEmail = async (email) => {
  try {
    const result = await EmailVerificationToken.findOneAndDelete({
      email: email,
    });
    console.log(result); // Log the result of the delete operation
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }
};

const sendAccountVerificationEmail = async (email, token) => {
  try {
    resend.emails.send({
      from: "onboarding@spinpapa.com",
      to: "gauravsingh9314@gmail.com",
      subject: "SpinPapa",
      react: <Registration email={email} token={token} />,
    });
  } catch (error) {
    return { error: "Failed to send account verification email" };
  }
};

export const registerUser = async (formData) => {
  let errorData = { error: "" };

  let vu = validateUsername(formData.get("username"));
  let ve = validateEmail(formData.get("email"));
  let vp = validatePassword(formData.get("password"));

  if (vu.length !== 0) errorData.error = vu;
  if (ve.length !== 0) errorData.error = ve;
  if (vp.length !== 0) errorData.error = vp;

  try {
    // console.log("form Data is Server,", formData);

    if (errorData.error.length !== 0) {
      console.log("Found Errors in Form Validation");
      return errorData;
    } else {
      console.log("Validated");
    }

    await connectMongoDB();

    let email = formData.get("email");
    let name = formData.get("username");
    let password = formData.get("password");

    const user = await User.findOne({ email }).select("_id");
    const userName = await User.findOne({ name }).select("_id");

    if (user) {
      return {
        error: "User already exists!",
      };
    } else if (userName) {
      return {
        error: "Username is already taken!",
      };
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      let res = await User.create({ name, email, password: hashedPassword });

      let timeNow = new Date();
      let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000);
    
      //TODO: send Email for verification
      let token = uuid4(); // we want a unique token of 16 characters
      console.log(token);
      console.log("User created, Now creating verification Token");

      await EmailVerificationToken.create({
        email,
        token,
        expires: expriringTime,
      });

      await sendAccountVerificationEmail(email, token);
      console.log(res);
    }
  } catch (error) {
    return { error: "Error Registering a User" };
  }
};

export const generatePasswordResetLink = async (formData) => {
  let errorData = { error: "" };
  let token = "";

  let ve = validateEmail(formData.get("email"));

  if (ve.length !== 0) errorData.error = ve;

  try {
    console.log("form Data in Server,", formData);

    if (errorData.error.length !== 0) {
      console.log("Found Errors in Form Validation");
      return errorData;
    } else {
      console.log("Validated");
    }

    await connectMongoDB();

    let email = formData.get("email");

    //const user = await PasswordReset.findOne({ email }).select("_id");
    const user = false;
    if (user) {
      console.log("Existing rows found");

      token = "Whalksjdl fjaldjfaidf"; // we want a unique token on 16 characters

      const filter = { email: email };
      const update = { token: token };
      let res = await PasswordReset.findOneAndUpdate(filter, update);
    } else {
      token = "kjadslfjalduf9202i398239jalkdja9dj"; // we want a unique token on 16 characters

      console.log("No existing rows found");
      let res = await PasswordReset.create({ email, token });
    }

    console.log(`http://localhost:3000/new-password?token=${token}`);
  } catch (error) {
    return { error: "Error Registering a User" };
  }
};

export const verifyUserEmailbyToken = async (token) => {
  //check if token is valid

  await connectMongoDB();

  const record = await EmailVerificationToken.findOne({ token });

  console.log("Record Data of Email Verification", record);
  if (record) {
    const currentTime = new Date();
    //check if token is not expired
    console.log("Time in Expires: ", record.expires);
    console.log("Time Now : ", currentTime);
    if (record.expires > currentTime) {
      //finally set the emailVerified field in user table to current date.

      let ifUserExists = await User.findOne({ email: record.email });

      if (ifUserExists) {
        await User.findOneAndUpdate(
          { email: record.email },
          { emailVerified: true }
        );

        await deleteExistingTokenByEmail(record.email); //delete token after being verified
        return { success: "Email Verified Successfully" };
      }else{
        return {error: "User doesn't Exist"}
      }
    } else {
      //token expired
      let newToken = uuid4();

      let verificationLink = `https://humble-computing-machine-97ww6wrxr6x37x7x.github.dev/new-email?token=${newToken}`;

      await EmailVerificationToken.findOneAndUpdate({
        email: record.email,
        token: newToken,
        expires: new Date() + 3600 * 1000,
      });

      await sendAccountVerificationEmail(record.email, newToken);
      return { success: "Verification Token has been sent Successfully" };
    }
  } else {
    return { error: "Invalid Token" };
  }
};
