"use client";

import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message, {
    id: 'datascope-success', // Usar um ID para evitar duplicatas rápidas
    title: 'DataScope',
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    id: 'datascope-error', // Usar um ID para evitar duplicatas rápidas
    title: 'DataScope',
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    id: 'datascope-loading', // Usar um ID para evitar duplicatas rápidas
    title: 'DataScope',
  });
};

export const dismissToast = (toastId?: string) => {
  toast.dismiss(toastId);
};