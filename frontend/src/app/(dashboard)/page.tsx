'use client'; 
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";

function HomeContent() {
  const {t} = useTranslation();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/sign-in');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome to Auth App</h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {user && (
            <>
              <span className="text-sm text-gray-600">
                Hello, {user.name}!
              </span>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <Button size="lg">{t("plularization", {
          count: 1,
        })}</Button>

        <Button size="sm">{t("welcomeMessage")}</Button>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AuthGuard requireAuth={true}>
      <HomeContent />
    </AuthGuard>
  );
}