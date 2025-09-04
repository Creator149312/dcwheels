"use client";

import { createContext, useContext, useState, useCallback } from "react";
import LoginModal from "@components/LoginModalTest";

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
      {isOpen && <LoginModal onClose={closeLoginPrompt} />}
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  return useContext(LoginPromptContext);
}
