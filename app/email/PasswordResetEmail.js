import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import apiConfig from "@utils/ApiUrlConfig";

// const baseUrl = process.env.VERCEL_URL
//   ? `https://${process.env.VERCEL_URL}`
//   : "";

const PasswordResetEmail = ({ email, token }) => {
  return (
    <Html>
      <Head />
      <Preview> You recently requested a password reset for your account
      associated....</Preview>
      <Tailwind>
        <Body className="bg-white">
          <Container className="mx-auto px-0 py-4 pb-12">
            {/* <Img
              src={"/spin-wheel-logo.png"}
              width="170"
              height="50"
              alt="Koala"
              className="mx-auto"
            /> */}
            <Text className="text-base leading-6">Hi {email},</Text>
            <Text className="text-base leading-6">
              You recently requested a password reset for your account
              associated with {email}.
            </Text>
            <Text className="text-base leading-6">
              To reset your password, please click on the following link:
            </Text>
            <Section className="text-center">
              <Button
                className="bg-slate-600 rounded-md text-white text-base py-4 px-4 block"
                href={`${apiConfig.baseUrl}/reset-password?token=${token}`}
              >
                Reset Password
              </Button>
            </Section>
            <Section>
              <Text>Important:</Text>
              <Text>1. This link is valid for 1 hour.</Text>
              <Text>
                2. If you did not request a password reset, please ignore this
                email.
              </Text>
            </Section>
            <Section>
              <Text className="text-base leading-6">
                Best,
                <br />
                The Spinpapa team
              </Text>
            </Section>
            <Hr className="border-gray-300 border-t border-b my-4" />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PasswordResetEmail;
