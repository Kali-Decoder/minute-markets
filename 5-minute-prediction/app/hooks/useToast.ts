"use client";

import { useToastContext } from "@/app/contexts/ToastContext";

export function useToast() {
  const { showToast, showSuccess, showError, showInfo, showWarning } = useToastContext();

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}

