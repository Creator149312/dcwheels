"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./ui/button";

export function FormSubmitButton({ btnTxt, btnTxtDisabled }) {
  const { pending } = useFormStatus();

  return (
    <Button
      size={"lg"}
      disabled={pending}
      type="submit"
      className={`p-3 ${pending ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {pending ? btnTxtDisabled : btnTxt}
    </Button>
  );
}
