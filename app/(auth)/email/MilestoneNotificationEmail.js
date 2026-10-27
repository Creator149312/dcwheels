import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

export default function MilestoneNotificationEmail({
  recipientName = "Creator",
  entityTitle = "Your item",
  entityType = "wheel", // "wheel" | "post" | "list"
  milestoneType = "LIKE", // "LIKE" | "COMMENT" | "SPIN"
  count = 10,
  targetUrl = "https://spinpapa.com",
  unsubscribeUrl = "https://spinpapa.com/settings",
}) {
  const typeLabel =
    entityType === "wheel"
      ? "wheel"
      : entityType === "list"
      ? "list"
      : "post";

  const actionWord =
    milestoneType === "LIKE"
      ? count === 1 ? "like" : "likes"
      : milestoneType === "COMMENT"
      ? count === 1 ? "comment" : "comments"
      : count === 1 ? "spin" : "spins";

  const headline =
    count === 1
      ? `Your ${typeLabel} just got its first ${actionWord}!`
      : `Your ${typeLabel} reached ${count.toLocaleString()} ${actionWord}! 🎉`;

  const previewText = `${headline} Check it out on Spinpapa.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#f8fafc] font-sans text-slate-800">
          <Container className="mx-auto my-8 max-w-[520px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {/* Header Brand */}
            <Section className="mb-6">
              <Text className="text-xl font-black tracking-tight text-slate-900 m-0">
                Spinpapa
              </Text>
            </Section>

            {/* Headline */}
            <Section className="mb-4">
              <Text className="text-2xl font-bold tracking-tight text-slate-900 leading-snug m-0 mb-2">
                {headline}
              </Text>
              <Text className="text-sm text-slate-600 m-0 leading-relaxed">
                Hi {recipientName}, people in the community are engaging with what you created.
              </Text>
            </Section>

            {/* Entity Card Box */}
            <Section className="my-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0 mb-1">
                {typeLabel}
              </Text>
              <Text className="text-base font-bold text-slate-900 m-0 line-clamp-2">
                &ldquo;{entityTitle}&rdquo;
              </Text>
              <Text className="text-sm font-semibold text-indigo-600 m-0 mt-2">
                {count.toLocaleString()} total {actionWord}
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className="my-6 text-center">
              <Button
                className="inline-block rounded-xl bg-slate-900 px-6 py-3.5 text-center text-sm font-bold text-white no-underline shadow-sm hover:bg-slate-800"
                href={targetUrl}
              >
                View on Spinpapa &rarr;
              </Button>
            </Section>

            <Hr className="border-t border-slate-200 my-6" />

            {/* Footer & Unsubscribe */}
            <Section>
              <Text className="text-xs text-slate-500 m-0 leading-5">
                You received this email because you created content on Spinpapa.
                We only send milestone updates when your creations hit meaningful thresholds.
              </Text>
              <Text className="text-xs text-slate-400 m-0 mt-2">
                Don&apos;t want these emails?{" "}
                <Link
                  href={unsubscribeUrl}
                  className="text-slate-500 underline"
                >
                  Turn off email notifications
                </Link>
                .
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
