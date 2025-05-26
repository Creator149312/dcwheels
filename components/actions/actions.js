"use server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@lib/mongodb";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";
import EmailVerificationToken from "@models/emailverificationtoken";
import PasswordReset from "@models/passwordreset";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Page from "@models/page";
import {
  validatePassword,
  validateUsername,
  validateEmail,
} from "@utils/Validator";
import Wheel from "@models/wheel";
import { Resend } from "resend";
import Registration from "@app/email/registration";
import uuid4 from "uuid4";
import PasswordResetEmail from "@app/email/PasswordResetEmail";
import {
  ensureArrayOfObjects,
  replaceUnderscoreWithDash,
} from "@utils/HelperFunctions";

//this method is used when user is logged in
export const updateNewPassword = async (formData) => {
  let errorData = { error: "" };
  const session = await getServerSession(authOptions);

  errorData.error = validatePassword(formData.get("currentPassword"));
  errorData.error = validatePassword(formData.get("newPassword"));
  errorData.error = validatePassword(formData.get("retypeNewPassword"));

  if (formData.get("newPassword") !== formData.get("retypeNewPassword"))
    errorData.error = "Passwords do not match";

  if (errorData.error.length !== 0) {
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

//this method is used when user has forgot his current password
export const updateNewPasswordbyToken = async (formData, token) => {
  let errorData = { error: "" };
  await connectMongoDB();
  let record = await PasswordReset.findOne({ token: token });

  if (record) {
    errorData.error = validatePassword(formData.get("newPassword"));
    errorData.error = validatePassword(formData.get("retypeNewPassword"));

    if (formData.get("newPassword") !== formData.get("retypeNewPassword"))
      errorData.error = "Passwords do not match";

    if (errorData.error.length !== 0) {
      return {
        error: errorData.error,
      };
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
        await PasswordReset.deleteOne({ email: record.email });
      } else {
        //send error message to client
        return {
          error: "Please login to change Password!",
        };
      }
    } catch (error) {
      // console.log(error);
      return { error: "Error resetting password" };
    }
  } else {
    return { error: "InValid Password Reset Request" };
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
    }
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }

  // if (isUserDeleted) {
  //   redirect("/login");
  // }
};

const getVerificationTokenByEmail = async (email) => {
  try {
    const result = await EmailVerificationToken.findOne({ email: email });
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }
};

const deleteExistingTokenByEmail = async (email) => {
  try {
    const result = await EmailVerificationToken.findOneAndDelete({
      email: email,
    });
  } catch (error) {
    return { error: "Please login to delete your Account" };
  }
};

const sendAccountVerificationEmail = async (email, token) => {
  const resend = new Resend(process.env.EMAIL_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: "Spinpapa <onboarding@spinpapa.com>",
      to: [`${email}`],
      subject: "Account Verification",
      react: <Registration email={email} token={token} />,
    });
  } catch (error) {
    return { error: "Failed to send account verification email" };
  }
};

const sendPasswordResetLinkEmail = async (email, token) => {
  const resend = new Resend(process.env.EMAIL_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: "Spinpapa <onboarding@spinpapa.com>",
      to: [`${email}`],
      subject: "Password Reset Request",
      react: <PasswordResetEmail email={email} token={token} />,
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
    if (errorData.error.length !== 0) {
      return { error: errorData };
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
      let res = await User.create({
        name,
        email,
        password: hashedPassword,
        authMethod: "emailPassword",
      });

      let timeNow = new Date();
      // let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000);
      let expiringTime = new Date(timeNow.getTime() + 2 * 24 * 60 * 60 * 1000); //2 days after registration email is sent

      //TODO: send Email for verification
      let token = uuid4(); // we want a unique token of 16 characters

      await EmailVerificationToken.create({
        email,
        token,
        expires: expiringTime,
      });

      await sendAccountVerificationEmail(email, token);
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
    if (errorData.error.length !== 0) {
      return { error: errorData };
    }

    await connectMongoDB();

    let email = formData.get("email");
    const ifUserExists = await User.findOne({ email });

    if (ifUserExists) {
      const user = await PasswordReset.findOne({ email }).select("_id");

      if (user) {
        let timeNow = new Date();
        let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000); //expire in 1 hr

        //TODO: send Email for verification
        token = uuid4(); // we want a unique token of 16 characters

        const filter = { email: email };
        const update = { token: token };
        const expires = { expires: expriringTime };
        let res = await PasswordReset.findOneAndUpdate(filter, update, expires);
      } else {
        let timeNow = new Date();
        let expriringTime = timeNow.setTime(timeNow.getTime() + 3600 * 1000); //expire in 1 hr
        token = uuid4(); // we want a unique token of 16 characters

        let res = await PasswordReset.create({
          email,
          token,
          expires: expriringTime,
        });
      }

      // console.log(`http://localhost:3000/reset-password?token=${token}`);

      await sendPasswordResetLinkEmail(email, token);

      return { success: "Check your email for password reset link!" };
    } else {
      return { error: "User not found!" };
    }
  } catch (error) {
    return { error: "Unexpected Error Occured!" };
  }
};

export const verifyUserEmailbyToken = async (token) => {
  //check if token is valid
  await connectMongoDB();

  const record = await EmailVerificationToken.findOne({ token });

  if (record) {
    const currentTime = new Date();
    if (record.expires > currentTime) {
      //finally set the emailVerified field in user table to current date.

      let ifUserExists = await User.findOne({ email: record.email });

      if (ifUserExists) {
        await User.findOneAndUpdate(
          { email: record.email },
          { emailVerified: true }
        );

        // Schedule token deletion after a delay
        setTimeout(async () => {
          await deleteExistingTokenByEmail(record.email); //delete token after being verified
        }, 1000 * 60 * 5); // Delete token after 5 minutes

        return { success: "Email Verified Successfully!" };
      } else {
        return { error: "User doesn't Exist!" };
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
      return { success: "Verification Email has been sent Successfully" };
    }
  } else {
    return { error: "Invalid Token" };
  }
};

export async function getPageDataBySlug(slug) {
  //check if token is valid
  await connectMongoDB();

  // const pageData = await Page.findOne({ slug }).populate("wheel");
  const pageData = await Page.findOne({ slug })
    .select("title description content wheel")
    .populate("wheel")
    .lean();

  return pageData;
}

export async function getAllWheelPages() {
  await connectMongoDB();

  const Slugs = await Page.aggregate([
    {
      $project: {
        _id: 0,
        slug: 1,
      },
    },
  ]);

  return Slugs.map((doc) => doc.slug);
}

export async function storeWheelDataToDatabase(initialJSONData) {
  try {
    const { jsonKey, jsonData } = initialJSONData; // Extract the JSON data from the request body

    // console.log("JsonKey = ", jsonKey);
    // console.log("jsonData = ", jsonData);

    // Validate the JSON data to ensure it has the necessary fields
    if (
      !jsonData ||
      !jsonData.title ||
      !jsonData.description ||
      !jsonData.segments
    ) {
      return { message: "Invalid JSON format. Missing required fields." };
    }

    await connectMongoDB();

    // Step 1: Create the Wheel
    const wheelData = jsonData; // Directly use the JSON data received

    const dataObjectForSegments = ensureArrayOfObjects(wheelData.segments);

    const wheelExists = await Wheel.findOne({ title: wheelData.title });
    if (wheelExists) {
      console.log("Wheel Exists in DB \n", wheelExists);
      console.log("For title wheelData.title = ", wheelData.title);
    }
    let wheel = null;

    if (wheelExists) {
      wheel = await Wheel.findOneAndUpdate({
        title: wheelData.title,
        description: wheelData.description,
        category: wheelData.category || "",
      });
    } else {
      wheel = new Wheel({
        title: wheelData.title,
        description: wheelData.description,
        data: dataObjectForSegments || [], // Handle content if present
        createdBy: "gauravsingh9314@gmail.com", // Assuming admin for simplicity
        category: wheelData.category || "",
      });
      // Save the wheel to the database
      await wheel.save();
    }

    // console.log("Wheel Saved");

    const pageSlug = replaceUnderscoreWithDash(jsonKey);
    // Step 2: Create the Page
    const pageData = {
      title: `${wheelData.title}`,
      description: `${wheelData.description}`,
      content: wheelData.content || [],
      slug: pageSlug.toLowerCase(),
      indexed: true,
      wheel: wheel._id, // Reference to the created wheel
    };

    const page = new Page(pageData);
    await page.save();

    // console.log("Paged Saved");
    return {
      success: "Page and Wheel Created Successfully",
    };
  } catch (error) {
    // console.log("Error ", error);
    return { error: "Error Creating Page and Wheel" };
  }
}
