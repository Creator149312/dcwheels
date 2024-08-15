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

const Registration = ({ email, token }) => {
  return (
    <Html>
      <Head />
      <Preview>
        The interactive online platform 
        for users to create and spin custom wheels.
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
              Welcome to Spinpapa, fun and interactive online platform that
              allows users to create and spin custom wheels for various
              purposes.
            </Text>
            <Text className="text-base leading-6">
              Whether it is deciding on a restaurant, assigning chores, or
              generating random ideas, Spinpapa offers a simple and entertaining
              way to make choices..
            </Text>
            <Section className="text-center">
              <Button
                className="bg-slate-600 rounded-md text-white text-base py-4 px-4 block"
                href={`https://dcwheels.vercel.app/verify/new-email?token=${token}&email=${email}`}
              >
                Verify Email
              </Button>
            </Section>
            <Text className="text-base leading-6">
              Best,
              <br />
              The Spinpapa team
            </Text>
            <Hr className="border-gray-300 border-t border-b my-4" />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Registration;
