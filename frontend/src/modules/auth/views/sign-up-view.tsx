"use client";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import { OctagonAlertIcon } from "lucide-react";
import { useForm } from "react-hook-form"; 
import { useRouter } from "next/navigation";
import { useState } from "react";
import {FaGoogle} from "react-icons/fa";
import { useTranslation } from "react-i18next";

import {Input} from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {Button} from "@/components/ui/button";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Card, CardContent} from "@/components/ui/card";
import {Alert, AlertTitle} from "@/components/ui/alert";
import Link from "next/link";

const formSchema = z.object({
  name:z.string().min(4,{message:"Name is Required"}),
  email: z.string().email(),
  password: z.string().min(1, "Password is Required"),
  confirmPassword: z.string().min(1, "Confirm Password is Required"),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const SignUpView = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setPending(true);
    
    try {
      await authClient.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setPending(false);
      router.push("/");
    } catch (error: any) {
      setPending(false);
      setError(error.message || t("auth.signUp.registrationFailed"));
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
                    {t("auth.signUp.title")}
                  </h1>
                  <p className="text-muted-foreground text-balance">
                    {t("auth.signUp.subtitle")}
                  </p>
                </div>
                                <div className="grid gap-3">
                  <FormField 
                  control={form.control}
                  name="name"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel htmlFor="name">{t("auth.signUp.name")}</FormLabel>
                      <FormControl>
                        <Input 
                          id="name"
                          type="text" 
                          placeholder={t("auth.signUp.namePlaceholder")} 
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
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel htmlFor="email">{t("auth.signUp.email")}</FormLabel>
                      <FormControl>
                        <Input 
                          id="email"
                          type="email" 
                          placeholder={t("auth.signUp.emailPlaceholder")} 
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
                      <FormLabel htmlFor="password">{t("auth.signUp.password")}</FormLabel>
                      <FormControl>
                        <Input 
                          id="password"
                          type="password" 
                          placeholder={t("auth.signUp.passwordPlaceholder")} 
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
                  name="confirmPassword"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel htmlFor="confirmPassword">{t("auth.signUp.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input 
                          id="confirmPassword"
                          type="password" 
                          placeholder={t("auth.signUp.passwordPlaceholder")} 
                          {...field} 
                        />
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
                <Button disabled={pending} type="submit" className="w-full">
                  {t("auth.signUp.signUpButton")}
                </Button>
                <div className="after:boarder-boarder relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    {t("auth.signUp.orContinueWith")}
                  </span>
                </div>
                <div className="flex justify-center">
                  <Button disabled={pending} onClick={() => onSocial( "google")} variant={"outline"} type="button" className="w-full">
                    <FaGoogle/>
                  </Button>
                </div>
                <div className="text-center text-sm">
                  {t("auth.signUp.haveAccount")}{" "}
                  <Link href="/sign-in" className="underline underline-offset-4">
                    {t("auth.signUp.signIn")}
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