import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { useEffect, useState } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

// Helper to safely format any value as a string for toast messages
const formatToastMessage = (message: unknown): string => {
  if (typeof message === 'string') {
    return message;
  }

  if (message instanceof Error) {
    return message.message || 'An error occurred';
  }

  if (message && typeof message === 'object') {
    const obj = message as any;
    if (obj.message && typeof obj.message === 'string') {
      return obj.message;
    }
    if (obj.error_description && typeof obj.error_description === 'string') {
      return obj.error_description;
    }
  }

  if (typeof message === 'undefined' || message === null) {
    return 'An error occurred';
  }

  return String(message);
};

// Wrapper around sonner toast to ensure messages are always properly formatted strings
export const toast = {
  error: (message: unknown, options?: any) => {
    return sonnerToast.error(formatToastMessage(message), options);
  },
  success: (message: unknown, options?: any) => {
    return sonnerToast.success(formatToastMessage(message), options);
  },
  info: (message: unknown, options?: any) => {
    return sonnerToast.info(formatToastMessage(message), options);
  },
  warning: (message: unknown, options?: any) => {
    return sonnerToast.warning(formatToastMessage(message), options);
  },
  loading: (message: unknown, options?: any) => {
    return sonnerToast.loading(formatToastMessage(message), options);
  },
  custom: (message: unknown, options?: any) => {
    return sonnerToast.custom(formatToastMessage(message), options);
  },
  promise: (promise: any, messages: any, options?: any) => {
    const formattedMessages = {
      loading: formatToastMessage(messages.loading),
      success: formatToastMessage(messages.success),
      error: formatToastMessage(messages.error),
    };
    return sonnerToast.promise(promise, formattedMessages, options);
  },
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration issues and setState during render
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
