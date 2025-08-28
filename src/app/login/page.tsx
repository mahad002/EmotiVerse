
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile, getUserByUsername } from '@/services/user';
import { sendAuthEmail } from '@/ai/flows/send-auth-email';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { countries } from '@/config/countries';
import { getUserProfile } from '@/services/user';

const phoneSchema = z
  .object({
    country: z.string(),
    countryCode: z.string(),
    number: z.string(),
  })
  .optional()
  .default({ country: '', countryCode: '', number: '' });

const signUpSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: phoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const logInSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const profileCompletionSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  phone: phoneSchema,
});

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M19.3,4.24a5.21,5.21,0,0,0-4.88,2.83,5.13,5.13,0,0,0-5.11-2.83c-2.43,0-4.6,1.8-5.76,4.32-2.3,4.68.7,11.2,3.33,14.63a6.3,6.3,0,0,0,4.88,2.57,6.43,6.43,0,0,0,4.68-2.57c2-2.63,3.33-5.35,3.43-5.45s-1.42-2-1.42-2-1.32.9-1.42.94-.3.1-.3-.21,1.11-4.22-1.12-6.19a4.8,4.8,0,0,0-3.32-1.52,4.8,4.8,0,0,0-4,2.36S13,14.28,15.25,14.28s2.28-2.52,2.28-2.52A5.36,5.36,0,0,0,19.3,4.24Z"
    />
  </svg>
);

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<FirebaseUser | null>(null);
  const [isProfileCompletionRequired, setIsProfileCompletionRequired] =
    useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: { country: 'United States', countryCode: '+1', number: '' },
      password: '',
    },
  });

  const logInForm = useForm<z.infer<typeof logInSchema>>({
    resolver: zodResolver(logInSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const profileCompletionForm = useForm<
    z.infer<typeof profileCompletionSchema>
  >({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      username: '',
      phone: { country: 'United States', countryCode: '+1', number: '' },
    },
  });

  const handleAuthSuccess = async (
    user: FirebaseUser,
    isSignUp: boolean,
    profile?: Partial<z.infer<typeof signUpSchema>>
  ) => {
    try {
      const finalEmail = profile?.email || user.email;
      if (isSignUp) {
        await createUserProfile({
          uid: user.uid,
          email: finalEmail,
          username: profile?.username || user.displayName,
          phone: profile?.phone?.number ? profile.phone : null,
        });
        await sendAuthEmail({
          email: finalEmail!,
          type: 'signup',
          username: profile?.username || user.displayName || 'there',
        });
        toast({
          title: 'Account Created',
          description: 'Welcome! Your account has been successfully created.',
        });
      } else {
        await sendAuthEmail({ email: user.email!, type: 'login' });
        toast({ title: 'Login Successful', description: 'Welcome back!' });
      }
      router.push('/');
    } catch (error: any) {
      console.error('Error during post-auth actions:', error);
      toast({
        title: 'Post-Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email!,
        values.password
      );
      await handleAuthSuccess(userCredential.user, true, values);
    } catch (error: any) {
      toast({
        title: 'Sign Up Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onLogIn = async (values: z.infer<typeof logInSchema>) => {
    setLoading(true);
    try {
      let email = values.identifier;
      // Check if identifier is likely not an email
      if (!email.includes('@')) {
        const userProfile = await getUserByUsername(email);
        if (userProfile && userProfile.email) {
          email = userProfile.email;
        } else {
          throw new Error('User not found.');
        }
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        values.password
      );
      await handleAuthSuccess(userCredential.user, false);
    } catch (error: any) {
      toast({
        title: 'Log In Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const authProvider =
      provider === 'google'
        ? new GoogleAuthProvider()
        : new OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(auth, authProvider);
      const userProfile = await getUserProfile(result.user.uid);

      if (userProfile) {
        // Existing user, treat as login
        await handleAuthSuccess(result.user, false);
      } else {
        // New user, prompt for profile completion
        setPendingUser(result.user);
        profileCompletionForm.setValue(
          'username',
          result.user.displayName || ''
        );
        setIsProfileCompletionRequired(true);
      }
    } catch (error: any) {
      toast({
        title: 'Sign In Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onCompleteProfile = async (
    values: z.infer<typeof profileCompletionSchema>
  ) => {
    if (!pendingUser) return;
    setLoading(true);
    try {
      await handleAuthSuccess(pendingUser, true, {
        username: values.username,
        phone: values.phone,
        email: pendingUser.email || '',
        password: '', // Not needed for OAuth
      });
      setIsProfileCompletionRequired(false);
      setPendingUser(null);
    } catch (error: any) {
      toast({
        title: 'Profile Completion Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Log In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Log In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...logInForm}>
                <form
                  onSubmit={logInForm.handleSubmit(onLogIn)}
                  className="space-y-4"
                >
                  <FormField
                    control={logInForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Username</FormLabel>
                        <FormControl>
                          <Input placeholder="email or username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={logInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="********"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Log In
                  </Button>
                </form>
              </Form>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthSignIn('apple')}
                  disabled={loading}
                >
                  <AppleIcon />
                  Apple
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create a new account to start your journey.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...signUpForm}>
                <form
                  onSubmit={signUpForm.handleSubmit(onSignUp)}
                  className="space-y-4"
                >
                  <FormField
                    control={signUpForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="your_username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Phone Number (optional)</FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={signUpForm.control}
                        name="phone.country"
                        render={({ field }) => (
                          <Select
                            onValueChange={(value) => {
                              const country = countries.find(
                                (c) => c.name === value
                              );
                              if (country) {
                                field.onChange(value);
                                signUpForm.setValue(
                                  'phone.countryCode',
                                  country.dial_code
                                );
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.name}
                                >
                                  {country.name} ({country.dial_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="phone.number"
                        render={({ field }) => (
                          <FormControl>
                            <Input placeholder="123 456 7890" {...field} />
                          </FormControl>
                        )}
                      />
                    </div>
                    <FormMessage>
                      {signUpForm.formState.errors.phone?.number?.message ||
                        signUpForm.formState.errors.phone?.country
                          ?.message ||
                        signUpForm.formState.errors.phone?.countryCode
                          ?.message}
                    </FormMessage>
                  </FormItem>
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="********"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Account
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isProfileCompletionRequired}
        onOpenChange={setIsProfileCompletionRequired}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Welcome! Please provide a username and phone number to complete
              your registration.
            </DialogDescription>
          </DialogHeader>
          <Form {...profileCompletionForm}>
            <form
              onSubmit={profileCompletionForm.handleSubmit(onCompleteProfile)}
              className="space-y-4 py-4"
            >
              <FormField
                control={profileCompletionForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your_username"
                        {...field}
                        defaultValue={pendingUser?.displayName || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Phone Number (optional)</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={profileCompletionForm.control}
                    name="phone.country"
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => {
                          const country = countries.find(
                            (c) => c.name === value
                          );
                          if (country) {
                            field.onChange(value);
                            profileCompletionForm.setValue(
                              'phone.countryCode',
                              country.dial_code
                            );
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem
                              key={country.code}
                              value={country.name}
                            >
                              {country.name} ({country.dial_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormField
                    control={profileCompletionForm.control}
                    name="phone.number"
                    render={({ field }) => (
                      <FormControl>
                        <Input placeholder="123 456 7890" {...field} />
                      </FormControl>
                    )}
                  />
                </div>
                <FormMessage>
                  {profileCompletionForm.formState.errors.phone?.number
                    ?.message ||
                    profileCompletionForm.formState.errors.phone?.country
                      ?.message ||
                    profileCompletionForm.formState.errors.phone?.countryCode
                      ?.message}
                </FormMessage>
              </FormItem>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save and Continue
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
