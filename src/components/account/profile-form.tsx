"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { updateAvatar, updateProfile } from "@/actions/account";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Profile } from "@/lib/types";
import { initials } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const { t } = useI18n();
  const a = t.account;
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (state?.ok) toast.success(state.message); }, [state]);

  async function onFile(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast.error(a.photoType);
    if (file.size > 2 * 1024 * 1024) return toast.error(a.photoSize);
    setUploading(true);
    const supabase = createClient();
    const path = `${profile.user_id}/avatar-${Date.now()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) { setUploading(false); return toast.error(a.uploadFailed, { description: error.message }); }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const res = await updateAvatar(url);
    setUploading(false);
    if (!res.ok) return toast.error(res.error);
    setAvatar(url);
    toast.success(a.photoUpdated);
  }

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <div className="rounded-[1.5rem] border border-border p-6 sm:p-8">
      <div className="flex items-center gap-5">
        <button type="button" onClick={() => fileRef.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2" aria-label={a.changePhotoAria}>
          {avatar ? <Image src={avatar} alt="" fill sizes="80px" className="object-cover" /> : <span className="grid h-full w-full place-items-center text-xl font-semibold">{initials(profile.full_name, email)}</span>}
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">{uploading ? <Spinner /> : <Camera className="h-5 w-5" />}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <div>
          <p className="text-lg font-semibold">{profile.full_name ?? a.yourProfile}</p>
          <p className="text-sm text-muted">{email}</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-sm font-medium underline-offset-4 hover:underline">{a.changePhoto}</button>
        </div>
      </div>

      <form action={action} className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label={t.checkout.fullName} htmlFor="full_name" error={errors?.full_name?.[0]}>
          <Input id="full_name" name="full_name" autoComplete="name" defaultValue={profile.full_name ?? ""} required />
        </Field>
        <Field label={a.phone} htmlFor="phone" optional>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} />
        </Field>
        <Field className="sm:col-span-2" label={t.auth.email} htmlFor="email" hint={a.emailHint}>
          <Input id="email" value={email} disabled readOnly />
        </Field>
        {state && !state.ok && !errors && <p className="text-sm text-sale sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2"><Button type="submit" loading={pending}>{t.common.saveChanges}</Button></div>
      </form>
    </div>
  );
}
