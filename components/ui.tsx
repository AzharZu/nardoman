import Link from "next/link";
import type { Route } from "next";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Container({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Panel({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("soft-panel p-4 sm:p-6", className)}>{children}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      {eyebrow ? <p className="text-[0.7rem] uppercase tracking-[0.3em] text-[#6ca86b]">{eyebrow}</p> : null}
      <h2 className="text-2xl font-semibold tracking-tight text-[#1f2639] sm:text-3xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-6 text-[#6f7380] sm:text-base">{description}</p> : null}
    </div>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "border border-transparent bg-[#6dae58] text-white hover:bg-[#5f9c4d]",
    secondary:
      "border border-[#c7cfbe] bg-[#f3f4ef] text-[#2f4e2f] hover:bg-[#e8ebdf]",
    ghost: "border border-transparent bg-transparent text-[#2c3344] hover:bg-[#eceff2]",
    danger: "border border-transparent bg-danger text-white hover:opacity-90"
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium tracking-[-0.01em] transition duration-300 focus:outline-none focus:ring-2 focus:ring-accent-blue/60 disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  className,
  variant = "primary",
  prefetch = true
}: PropsWithChildren<{ href: Route; className?: string; variant?: "primary" | "secondary" | "ghost"; prefetch?: boolean }>) {
  const styles = {
    primary:
      "border border-transparent bg-[#6dae58] text-white hover:bg-[#5f9c4d]",
    secondary:
      "border border-[#c7cfbe] bg-[#f3f4ef] text-[#2f4e2f] hover:bg-[#e8ebdf]",
    ghost: "border border-transparent bg-transparent text-[#2c3344] hover:bg-[#eceff2]"
  }[variant];

  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium tracking-[-0.01em] transition duration-300",
        styles,
        className
      )}
      href={href}
      prefetch={prefetch}
    >
      {children}
    </Link>
  );
}

export function Badge({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-[#d4d9ce] bg-[#f4f5ef] px-2.5 py-1 text-xs text-[#2b3243]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta
}: {
  label: string;
  value: string | number;
  delta?: string;
}) {
  return (
    <Panel className="p-4">
      <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[#6f7380]">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold tracking-tight text-[#1f2639]">{value}</p>
        {delta ? <p className="pb-1 text-xs text-success">{delta}</p> : null}
      </div>
    </Panel>
  );
}

export function NavLink({
  href,
  children,
  prefetch = true
}: PropsWithChildren<{ href: Route; prefetch?: boolean }>) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="rounded-full border border-transparent px-3 py-2 text-sm text-[#3a4252] transition duration-300 hover:border-[#d8dbde] hover:bg-[#eceff2]"
    >
      {children}
    </Link>
  );
}
