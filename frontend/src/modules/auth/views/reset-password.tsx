"use client"

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPassword } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { OctagonAlertIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const ResetPasswordView = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const token = searchParams.get("token");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (formData: z.infer<typeof formSchema>) => {
    setError(null);
    if (!token) {
      setError(t("auth.resetPassword.invalidToken"));
      return;
    }

    setPending(true);
    
    try {
      const result = await resetPassword({ 
        token, 
        password: formData.password 
      });
      toast.success(result.message);
      router.push('/sign-in');
    } catch (error: any) {
      setError(error.message || t("auth.resetPassword.error"));
      toast.error(error.message || t("auth.resetPassword.error"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form className="p-6 md:p-8" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">{t("auth.resetPassword.title")}</h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("auth.resetPassword.subtitle")}
                  </p>
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="password">{t("auth.resetPassword.newPassword")}</FormLabel>
                        <FormControl>
                          <Input id="password" type="password" placeholder={t("auth.resetPassword.passwordPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="confirmPassword">{t("auth.resetPassword.confirmPassword")}</FormLabel>
                        <FormControl>
                          <Input id="confirmPassword" type="password" placeholder={t("auth.resetPassword.passwordPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!!error && (
                  <Alert className="bg-destructive/10 border-none">
                    <OctagonAlertIcon className="h-4 w-4 !text-destructive" />
                    <AlertTitle>{error}</AlertTitle>
                  </Alert>
                )}

                <Button disabled={pending} className="w-full" type="submit">
                  {pending ? t("auth.resetPassword.resetting") : t("auth.resetPassword.resetButton")}
                </Button>

                <div className="text-center text-sm text-accent-foreground">
                  {t("auth.resetPassword.rememberedPassword")}{" "}
                  <Link href="/sign-in" className="underline underline-offset-4">
                    {t("auth.resetPassword.signIn")}
                  </Link>
                </div>
              </div>
            </form>
          </Form>

          <div className="bg-custom-sidebar-gradient relative hidden md:flex flex-col gap-y-4 items-center justify-center">
            <img src="./transport.svg" alt="Image" className="w-[92px] h-[92px]" />
            <p className="text-2xl font-semibold text-white">Temari Go</p>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-sm text-balance *:[a]:underline *:[a]:underline-offset-4">
        {t("auth.common.agreeTerms")}{" "}
        <a href="#">{t("auth.common.termsOfService")}</a> and{" "}
        <a href="#">{t("auth.common.privacyPolicy")}</a>.
      </div>
    </div>
  );
};

