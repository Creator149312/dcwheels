"use client";

import LoginForm from "./LoginForm";
import { Dialog, DialogContent } from "./ui/dialog";

/**
 * Production-grade Login Modal using Radix UI Dialog.
 */
export default function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md p-0 border-none bg-transparent shadow-none">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 relative shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You need to be logged in to perform this action.
            </p>
          </div>

          <LoginForm embedded onSuccess={onClose} onCancel={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}