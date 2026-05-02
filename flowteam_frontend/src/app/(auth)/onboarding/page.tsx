"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  const handleCreateTeam = async () => {
    if (!teamName) return;
    setLoading(true);
    try {
      const res = await api.post("/teams/", { name: teamName });
      if (res.data.success) {
        setTeamId(res.data.data.id);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const validEmails = emails.filter(e => e.trim() !== "");
      for (const email of validEmails) {
        await api.post(`/teams/${teamId}/invite/`, { email, role: "member" });
      }
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      router.push("/dashboard"); // Proceed anyway
    } finally {
      setLoading(false);
    }
  };

  const addEmailField = () => {
    if (emails.length < 5) {
      setEmails([...emails, ""]);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
             <Badge variant="outline">Step {step} of 2</Badge>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 ? "Create your team" : "Invite teammates"}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? "Give your team a name to get started." 
              : "Add the email addresses of the people you want to work with."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <div className="grid gap-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="Acme Corp"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              {teamName && (
                <p className="text-xs text-slate-500">
                  Preview slug: <span className="font-mono">{teamName.toLowerCase().replace(/\s+/g, '-')}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {emails.map((email, idx) => (
                <div key={idx} className="grid gap-2">
                  <Input
                    type="email"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...emails];
                      newEmails[idx] = e.target.value;
                      setEmails(newEmails);
                    }}
                  />
                </div>
              ))}
              {emails.length < 5 && (
                <Button variant="ghost" size="sm" onClick={addEmailField}>
                  + Add another
                </Button>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 1 ? (
            <Button className="w-full" onClick={handleCreateTeam} disabled={!teamName || loading}>
              {loading ? "Creating..." : "Continue"}
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                Skip
              </Button>
              <Button className="flex-1" onClick={handleInvite} disabled={loading}>
                {loading ? "Inviting..." : "Finish"}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
