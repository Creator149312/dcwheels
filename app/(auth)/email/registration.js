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

const Registration = ({ email, token }) => {
  return (
    <Html>
      <Head />
      <Preview>
       Please complete your registration by verifying your email address..
      </Preview>
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
            <Text className="text-base leading-6">Welcome to Spinpapa!</Text>
            <Text className="text-base leading-6">Hi {email},</Text>
            <Text className="text-base leading-6">
              To complete your registration and start using Spinpapa, please
              click the button below to verify your email address:
            </Text>
            <Section className="text-center">
              <Button
                className="bg-slate-600 rounded-md text-white text-base py-4 px-4 block"
                href={`${apiConfig.baseUrl}/verify/new-email?token=${token}&email=${email}`}
              >
                Verify Email
              </Button>
            </Section>
            <Text className="text-base leading-6">
              Sincerely,
              <br />
              The Spinpapa Team
            </Text>
            <Hr className="border-gray-300 border-t border-b my-4" />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Registration;
