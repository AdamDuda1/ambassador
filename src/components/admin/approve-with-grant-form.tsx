"use client";

import { useRef, type ComponentProps, type FormEvent } from "react";

type ApproveWithGrantFormProps = Omit<ComponentProps<"form">, "onSubmit">;

export function ApproveWithGrantForm(props: ApproveWithGrantFormProps) {
  const provisionGrantRef = useRef<HTMLInputElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const shouldProvisionGrant = window.confirm("Do you want to provision an office grant too?");

    if (provisionGrantRef.current !== null) {
      provisionGrantRef.current.value = shouldProvisionGrant ? "true" : "false";
    }

    const confirmationMessage = shouldProvisionGrant
      ? "Are you sure you want to approve this user and provision an office grant?"
      : "Are you sure you want to approve this user without provisioning an office grant?";

    if (!window.confirm(confirmationMessage)) {
      event.preventDefault();
    }
  }

  return (
    <form {...props} onSubmit={handleSubmit}>
      <input ref={provisionGrantRef} type="hidden" name="provisionGrant" value="false" />
      {props.children}
    </form>
  );
}
