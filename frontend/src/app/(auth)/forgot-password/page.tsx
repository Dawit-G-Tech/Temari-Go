import { ForgotPasswordView } from "@/modules/auth/views/forget-password";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Page() {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
        <div className="space-y-4">
          <ForgotPasswordView />
        </div>
      </div>
    </div>
  );
};
