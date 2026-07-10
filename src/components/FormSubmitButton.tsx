"use client";

import { Button } from "@heroui/react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: string;
  pendingLabel: string;
  className?: string;
};

export function FormSubmitButton({ children, pendingLabel, className }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={className}
      variant="primary"
      isDisabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
