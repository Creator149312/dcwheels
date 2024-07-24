import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

const Registration = ({ email , token}) => {
  return (
    <Html>
      <Head />
      <Preview>
        The sales intelligence platform that helps you uncover qualified leads.
      </Preview>
      <Tailwind>
        <Body className="bg-white">
          <Container className="mx-auto px-0 py-4 pb-12">
            <Img
              src={"/spin-wheel-logo.png"}
              width="170"
              height="50"
              alt="Koala"
              className="mx-auto"
            />
            <Text className="text-base leading-6">Hi {email},</Text>
            <Text className="text-base leading-6">
              Welcome to Koala, the sales intelligence platform that helps you
              uncover qualified leads and close deals faster.
            </Text>
            <Section className="text-center">
              <Button
                className="bg-indigo-600 rounded-md text-white text-base py-4 px-4 block"
                href={`https://dcwheels.vercel.app/verify/new-email?token=${token}&email=${email}`}
              >
                Verify Email
              </Button>
            </Section>
            <Text className="text-base leading-6">
              Best,
              <br />
              The Koala team
            </Text>
            <Hr className="border-gray-300 border-t border-b my-4" />
            <Text className="text-gray-500 text-sm">
              470 Noor Ave STE B #1148, South San Francisco, CA 94080
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Registration;
