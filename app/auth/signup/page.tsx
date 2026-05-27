import { Container, SectionTitle } from "@/components/ui";
import { SignupForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,248,232,0.72),rgba(239,233,220,0.92)_35%,rgba(205,222,184,0.4)_100%)]" />
      <Container className="relative z-10 w-full max-w-4xl px-4">
        <div className="mx-auto max-w-md space-y-6 text-center">
          <SectionTitle
            eyebrow="Authentication"
            title="Create your profile"
            description="Join the platform with a polished onboarding surface connected to the live backend."
          />
          <SignupForm />
        </div>
      </Container>
    </div>
  );
}
