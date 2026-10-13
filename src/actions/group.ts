"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import type { ActionResult } from "@/lib/types";

/** Joins a group buy (join_group RPC). Errors come back as codes and are translated here. */
export async function joinGroup(code: string): Promise<ActionResult> {
  const [supabase, { t }] = await Promise.all([createClient(), getI18n()]);
  if (!/^[A-Za-z0-9]{6,12}$/.test(code)) return { ok: false, error: t.group.errors.NOT_FOUND };
  const { error } = await supabase.rpc("join_group", { p_code: code });
  if (error) {
    const key = Object.keys(t.group.errors).find((k) => error.message.includes(k));
    return { ok: false, error: t.group.errors[key ?? "generic"] };
  }
  revalidatePath(`/group/${code}`);
  return { ok: true, message: t.group.joined };
}
