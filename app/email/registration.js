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
        The interactive platform to create your custom spin wheels.
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
            <Text className="text-base leading-6">Hi {email},</Text>
            <Text className="text-base leading-6">
              Welcome to Spinpapa, fun and interactive online platform that
              allows users to create and spin custom wheels for various
              purposes.
            </Text>
            <Text className="text-base leading-6">
              Verify your accounts and start creating your wheels.
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
