"use client";

import { createContext, useContext, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// LoginModal pulls LoginForm → next-auth/react signIn, form validators,
// SignInBtn, and Notification. None of it is needed until the user performs
// an action that requires authentication. Lazy-loading removes all of that
// from the root bundle on every page in the app.
const LoginModal = dynamic(() => import("@components/LoginModal"), { ssr: false });

const LoginPromptContext = createContext();

export function LoginPromptProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openLoginPrompt = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <LoginPromptContext.Provider value={openLoginPrompt}>
      {children}
      <LoginModal isOpen={isOpen} onClose={closeLoginPrompt} />
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  return useContext(LoginPromptContext);
}
