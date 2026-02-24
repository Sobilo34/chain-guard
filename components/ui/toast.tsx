"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

export const Toaster = () => {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      theme="system"
      closeButton
    />
  );
};

export const toast = sonnerToast;

