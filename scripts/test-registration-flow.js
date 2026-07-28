import pkg from 'mongoose';
const { connect } = pkg;
import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.js";
import EmailVerificationToken from "../models/emailverificationtoken.js";
import { connectMongoDB } from "../lib/mongodb.js";

async function runTest() {
  console.log("--- STARTING REGISTRATION TEST ---");
  
  try {
    await connectMongoDB();
    
    const testEmail = "test_user_" + Date.now() + "@example.com";
    const testUsername = "testuser" + Date.now();

    console.log(`Step 1: Creating test user with email: ${testEmail}`);
    
    // Use a unique name to avoid E11000 duplicate key errors
    const newUser = await User.create({
      name: "Test User " + Date.now(),
      username: testUsername,
      email: testEmail,
      password: "hashedpassword123", 
      authMethod: "emailPassword",
    });
    console.log("✅ User created successfully.");

    console.log("Step 2: Creating verification token...");
    // Use a fixed token for predictable URL testing during this session
    const token = "debug-token-" + Math.floor(Math.random() * 100000);
    await EmailVerificationToken.findOneAndUpdate(
      { email: testEmail },
      { 
        token: token,
        expires: new Date(Date.now() + 3600 * 1000)
      },
      { upsert: true, new: true }
    );
    console.log("✅ Token created (upserted) successfully.");

    console.log(`Step 3: Verification URL: http://localhost:3000/verify/new-email?token=${token}`);
    
    console.log("\n--- TEST DATA GENERATED ---");
    console.log("You can now open the URL above in your browser to test the UI flow.");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Keep connection open or close it? 
    // Usually best to close in scripts.
    process.exit(0);
  }
}

runTest();
