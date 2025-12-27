import { SignInView } from "@/modules/auth/views/sign-in-view";
import { LanguageSwitcher } from "@/components/language-switcher";

const Page = () => {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <SignInView />
    </div>
  );
}

export default Page;    