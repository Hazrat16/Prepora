import { logout } from "@/app/actions/auth";
import { ProfileForm } from "@/components/app/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, daily_question_target")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">প্রোফাইল</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>
      <Card>
        <CardContent>
          <ProfileForm fullName={profile?.full_name ?? ""} target={profile?.daily_question_target ?? 20} />
        </CardContent>
      </Card>
      <form action={logout}><Button variant="outline" type="submit">লগআউট</Button></form>
    </div>
  );
}
