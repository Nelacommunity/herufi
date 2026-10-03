import { SettingsPanel } from "@/components/account/settings-panel";
import { getProfile } from "@/lib/auth";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.settings.title };
}

export default async function SettingsPage() {
  const profile = await getProfile();
  return <SettingsPanel marketing={profile?.marketing_opt_in ?? false} />;
}
