import { AuthGuard } from "@/components/auth-guard";

interface Props {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return (
    <AuthGuard requireAuth={false} redirectTo="/">
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm md:max-w-3xl">
              {children}
          </div>
      </div>
    </AuthGuard>
    );
};
export default layout;