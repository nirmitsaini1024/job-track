import { ProfileForm } from "@/components/profile/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserProfile } from "@/db/queries/profiles";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const profile = await getUserProfile(session.userId);

  return (
    <div className="mx-auto w-full max-w-2xl grid gap-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{session.username}</span>.
          Edit your resume and project details anytime.
        </p>
      </div>

      <Card>
        <CardHeader>
          {/* <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            Paste your full resume and project details in one field. Changes are
            saved only for your account.
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          <ProfileForm initialValue={profile?.resumeData ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
