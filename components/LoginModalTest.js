"use client";

import { Card } from "./ui/card";
import LoginForm from "./LoginFormTest";

export default function LoginModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-auto p-4 rounded shadow-lg relative">
        <button
          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Sign in to continue</h2>
        <LoginForm onSuccess={onClose} onCancel={onClose} />
      </Card>
    </div>
  );
}
