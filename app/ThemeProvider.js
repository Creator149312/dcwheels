"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"

// `refetchOnWindowFocus={false}` stops next-auth from re-hitting
// /api/auth/session every time the user tabs back to the window. Server
// actions still validate the session server-side, so a slightly stale
// client session object is safe — a stale read just means the action
// returns 401 and the user retries. Saves a network round-trip per focus.
export function ThemeProvider({ children, ...props }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </SessionProvider>
  );
}
