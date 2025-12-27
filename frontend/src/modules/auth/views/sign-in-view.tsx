"use client";
import { z } from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import { OctagonAlertIcon,EyeIcon, EyeOffIcon } from "lucide-react";
import { useForm } from "react-hook-form"; 
import { useRouter } from "next/navigation";
import {FaGoogle} from "react-icons/fa";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {Input} from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {Button} from "@/components/ui/button";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Card, CardContent} from "@/components/ui/card";
import {Alert, AlertTitle} from "@/components/ui/alert";
import Link from "next/link";


const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is Required"),
});


export const SignInView = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setPending(true);
    
    try {
      await authClient.login({
        email: data.email,
        password: data.password,
      });
      setPending(false);
      router.push("/");
    } catch (error: any) {
      setPending(false);
      setError(error.message || t("auth.signIn.loginFailed"));
    }
  };

  const onSocial = (provider: "google") => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${backendUrl}/api/auth/${provider}`;
  };

  return (
    <div className="flex flex-col - gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">
                    {t("auth.signIn.title")}
                  </h1>
                  <p className="text-muted-foreground text-balance">
                    {t("auth.signIn.subtitle")}
                  </p>
                </div>
                <div className="grid gap-3">
                  <FormField 
                  control={form.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel htmlFor="email">{t("auth.signIn.email")}</FormLabel>
                      <FormControl>
                        <Input 
                          id="email"
                          type="email" 
                          placeholder={t("auth.signIn.emailPlaceholder")} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}      
                  /> 
                </div>
                <div className="grid gap-3">
                  <FormField 
                  control={form.control}
                  name="password"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel htmlFor="password">{t("auth.signIn.password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={t("auth.signIn.passwordPlaceholder")}
                                {...field}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                                {showPassword ? (
                                    <EyeIcon className="w-4 h-4" />
                                ) : (
                                    <EyeOffIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}      
                  /> 
                  <div className="flex justify-end text-xs">
                    <Link href="/forgot-password" className="text-muted-foreground hover:text-primary underline underline-offset-4">
                        {t("auth.signIn.forgotPassword")}
                    </Link>
                  </div>
                </div>
                {!!error && (
                <Alert className="bg-destructive/10 border-none">
                  <OctagonAlertIcon className="h-4 w-4 !text-destructive" />
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
                )}
                <Button disabled={pending} type="submit" className="w-full">
                  {t("auth.signIn.signInButton")}
                </Button>
                <div className="after:boarder-boarder relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    {t("auth.signIn.orContinueWith")}
                  </span>
                </div>
                <div className="flex justify-center">
                  <Button disabled={pending} onClick={() => onSocial( "google")} variant={"outline"} type="button" className="w-full">
                    <FaGoogle/>
                  </Button>
                </div>
                <div className="text-center text-sm">
                  {t("auth.signIn.noAccount")}{" "}
                  <Link href="/sign-up" className="underline underline-offset-4">
                    {t("auth.signIn.signUp")}
                  </Link>
                </div>
              </div>
            </form> 
          </Form>

          <div className="bg-custom-sidebar-gradient relative hidden md:flex flex-col gap-y-4 items-center justify-center">
            <img src="./transport.svg" alt="Image" className="h-[92px] w-[92px]"/>
            <p className="text-2x1 font-semibold text-white">Temari Go</p>
          </div>
          
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        {t("auth.common.agreeTerms")}{" "}
        <a href="#" className="underline">
          {t("auth.common.termsOfService")}
        </a> and{" "}
        <a href="#" className="underline">
          {t("auth.common.privacyPolicy")}
        </a>.
      </div>
    </div>
    );
};