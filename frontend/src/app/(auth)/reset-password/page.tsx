import { ResetPasswordView } from "@/modules/auth/views/reset-password";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";

interface PageProps {
  searchParams: Promise<{ token: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const token = (await searchParams).token;

  if (!token) redirect("/sign-up");

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
        <ResetPasswordView />
      </div>
    </div>
  );
}