import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/hooks/useTheme";

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      position="top-center"
      richColors
      closeButton
      // Clear the sticky header so toasts are never hidden behind it.
      offset={84}
      style={{ zIndex: 100000 }}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border bg-popover text-popover-foreground shadow-xl",
          title: "font-medium",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
