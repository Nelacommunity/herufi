"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveEngagementSettings } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";

export type EngagementSettings = {
  checkin_enabled: boolean; checkin_cycle: number; checkin_reward_type: "percentage" | "fixed"; checkin_reward_value: number;
  checkin_min_subtotal: number; checkin_coupon_days: number; group_hours: number; group_price_days: number;
};

/** Daily check-in reward and group deal timing (engagement_settings, one row). */
export function EngagementSettingsForm({ settings, canEdit }: { settings: EngagementSettings; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveEngagementSettings, null);
  useEffect(() => {
    if (state?.ok) toast.success(state.message);
    else if (state && !state.ok) toast.error(state.error);
  }, [state]);
  const s = settings;
  return (
    <form action={action} className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-semibold">App rewards</h2>
      <p className="mt-1 text-sm text-muted">
        Shoppers who open the app and check in every day earn a personal, single-use code at the end of each streak.
        Group deals are set per product.
      </p>
      <fieldset disabled={!canEdit || pending} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Checkbox name="checkin_enabled" defaultChecked={s.checkin_enabled} label="Daily check-in on" className="sm:col-span-2 lg:col-span-4" />
        <Field label="Streak length (days)" htmlFor="checkin_cycle"><Input id="checkin_cycle" name="checkin_cycle" inputMode="numeric" defaultValue={s.checkin_cycle} /></Field>
        <Field label="Reward type" htmlFor="checkin_reward_type">
          <Select id="checkin_reward_type" name="checkin_reward_type" defaultValue={s.checkin_reward_type}>
            <option value="fixed">Amount off (TSh)</option>
            <option value="percentage">Percent off</option>
          </Select>
        </Field>
        <Field label="Reward value" htmlFor="checkin_reward_value"><Input id="checkin_reward_value" name="checkin_reward_value" inputMode="decimal" defaultValue={s.checkin_reward_value} /></Field>
        <Field label="Minimum order (TSh)" htmlFor="checkin_min_subtotal"><Input id="checkin_min_subtotal" name="checkin_min_subtotal" inputMode="decimal" defaultValue={s.checkin_min_subtotal} /></Field>
        <Field label="Code valid for (days)" htmlFor="checkin_coupon_days"><Input id="checkin_coupon_days" name="checkin_coupon_days" inputMode="numeric" defaultValue={s.checkin_coupon_days} /></Field>
        <Field label="Group must fill within (hours)" htmlFor="group_hours"><Input id="group_hours" name="group_hours" inputMode="numeric" defaultValue={s.group_hours} /></Field>
        <Field label="Group price usable for (days)" htmlFor="group_price_days"><Input id="group_price_days" name="group_price_days" inputMode="numeric" defaultValue={s.group_price_days} /></Field>
      </fieldset>
      {canEdit && <Button type="submit" className="mt-5" disabled={pending}>{pending ? "Saving…" : "Save rewards"}</Button>}
    </form>
  );
}
