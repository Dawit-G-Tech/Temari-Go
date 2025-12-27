import { SignUpView } from "@/modules/auth/views/sign-up-view";
import { LanguageSwitcher } from "@/components/language-switcher";

const Page = () => {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <SignUpView />
    </div>
  );
}

export default Page;    