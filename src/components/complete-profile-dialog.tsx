'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRY_CODES } from '@/config/country-codes';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z
    .string()
    .min(6, 'Enter a valid phone number')
    .regex(/^[\d\s\-()]+$/, 'Only digits, spaces, hyphens and parentheses'),
});
type FormData = z.infer<typeof schema>;

interface CompleteProfileDialogProps {
  open: boolean;
  userId: string;
  initialName: string;
  initialEmail: string;
  onSaved: () => void;
}

export default function CompleteProfileDialog({
  open,
  userId,
  initialName,
  initialEmail,
  onSaved,
}: CompleteProfileDialogProps) {
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName, phoneNumber: '' },
  });

  useEffect(() => {
    if (open) {
      setValue('name', initialName);
      setValue('phoneNumber', '');
    }
  }, [open, initialName, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!db || !auth?.currentUser) return;
    setBusy(true);
    try {
      const fullPhone = `${countryCode} ${data.phoneNumber.trim()}`.trim();
      await updateProfile(auth.currentUser, { displayName: data.name.trim() });
      await setDoc(
        doc(db, 'users', userId),
        {
          name: data.name.trim(),
          phone: fullPhone,
          email: initialEmail,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: 'Profile updated', description: 'Your name and phone have been saved.' });
      onSaved();
      reset();
    } catch (err) {
      toast({
        title: 'Could not save profile',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  });

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Please enter your name and phone number. This helps us personalize your experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="complete-name">Full name</Label>
            <Input
              id="complete-name"
              placeholder="Jane Smith"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name?.message && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Phone number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[180px] shrink-0">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="555 000 1234"
                autoComplete="tel-national"
                className="flex-1"
                {...register('phoneNumber')}
              />
            </div>
            {errors.phoneNumber?.message && (
              <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
