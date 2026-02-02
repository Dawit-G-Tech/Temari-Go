"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authAPI } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/lib/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Loader2 } from "lucide-react";

const accountFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone_number: z.string().optional(),
  username: z.string().optional(),
  language_preference: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "am", label: "Amharic" },
];

function toFormValues(u: User | null): AccountFormValues {
  if (!u) {
    return {
      name: "",
      email: "",
      phone_number: "",
      username: "",
      language_preference: "en",
    };
  }
  return {
    name: u.name ?? "",
    email: u.email ?? "",
    phone_number: u.phone_number ?? "",
    username: u.username ?? "",
    language_preference: u.language_preference ?? "en",
  };
}

export interface AccountViewProps {
  /** Server-fetched user for initial render; view still uses useAuth for refresh/submit */
  initialUser?: User | null;
}

export function AccountView({ initialUser }: AccountViewProps) {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: toFormValues(initialUser ?? null),
  });

  const effectiveUser = user ?? initialUser ?? null;

  useEffect(() => {
    if (effectiveUser) {
      form.reset(toFormValues(effectiveUser));
    }
  }, [
    effectiveUser?.id,
    effectiveUser?.name,
    effectiveUser?.email,
    effectiveUser?.phone_number,
    effectiveUser?.username,
    effectiveUser?.language_preference,
    form,
  ]);

  const onSubmit = async (data: AccountFormValues) => {
    setError(null);
    setSuccess(false);
    try {
      await authAPI.updateProfile(
        {
          name: data.name,
          phone_number: data.phone_number || null,
          username: data.username || null,
          language_preference: data.language_preference || null,
        },
        authClient.getAccessToken() ?? undefined
      );
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const showLoader = authLoading && !initialUser;

  if (showLoader) {
    return (
      <div className="w-full flex items-center justify-center min-h-[200px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <UserIcon className="size-6" />
          Account
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and profile.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
          <AlertDescription>Profile updated successfully.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <CardDescription>
            Update your name, phone, username, and language. Email cannot be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled
                        className="bg-muted"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Email cannot be changed. Contact support if you need to update it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="+251 910111213" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "en"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin mr-2" />
                )}
                Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
