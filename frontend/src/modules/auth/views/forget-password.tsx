"use client";

import { Card, CardContent } from "@/components/ui/card";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { OctagonAlertIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { forgotPassword } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
    email: z.string().email(),
})

export const ForgotPasswordView = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (formData: z.infer<typeof formSchema>) => {
        setError(null);
        setPending(true);
        
        try {
            const result = await forgotPassword({ email: formData.email });
            toast.success(result.message);
            // Optionally redirect to sign-in page
            router.push('/sign-in');
        } catch (error: any) {
            setError(error.message || t("auth.forgotPassword.error"));
            toast.error(error.message || t("auth.forgotPassword.error"));
        } finally {
            setPending(false);
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2" >
                    <Form {...form}>
                        <form className="p-6 md:p-8" onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col items-center text-center">
                                    <h1 className="text-2xl font-bold">
                                        {t("auth.forgotPassword.title")}
                                    </h1>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {t("auth.forgotPassword.subtitle")}
                                    </p>
                                </div>
                                <div className="grid gap-3">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="email">{t("auth.forgotPassword.email")}</FormLabel>
                                                <FormControl>
                                                    <Input id="email" placeholder={t("auth.forgotPassword.emailPlaceholder")} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 
                                </div>
                                {!!error && (
                                    <Alert className="bg-destructive/10 border-none ">
                                        <OctagonAlertIcon className="h-4 w-4 !text-destructive " />
                                        <AlertTitle>{error}</AlertTitle>
                                    </Alert>
                                )}
                                <Button disabled={pending} onClick={form.handleSubmit(onSubmit)} className="w-full" type="submit">
                                    {pending ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendButton")}
                                </Button>
                                <div className="after:border-border relative text-center text-sm after:absolute 
                after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                                    <span className="bg-card text-muted-foreground relative z-10 px-2">
                                        {t("auth.forgotPassword.orContinueWith")}
                                    </span>
                                </div>
                                
                                <div className="text-center text-sm text-accent-foreground">
                                     {t("auth.forgotPassword.rememberPassword")}{" "} 
                                     <Link href={"/sign-in"} className="underline underline-offset-4">
                                        {t("auth.forgotPassword.signIn")}
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </Form>

                    <div className="bg-custom-sidebar-gradient relative hidden md:flex flex-col gap-y-4 items-center justify-center">
                        <img src="./transport.svg" alt="Image" className="w-[92px] h-[92px]" />
                        <p className="text-2xl font-semibold text-white">
                            Temari Go
                        </p>
                    </div>
                </CardContent>
            </Card>
            <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-sm text-balance *:[a]:underline *:[a]:underline-offset-4">
                {t("auth.common.agreeTerms")}{" "}
                <a href="#">{t("auth.common.termsOfService")}</a> and{" "}
                <a href="#">{t("auth.common.privacyPolicy")}</a>.
            </div>
        </div>
    )
}