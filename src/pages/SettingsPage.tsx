import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, Key, Clock, Users, Bell, UserPlus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useSARData } from "@/context/SARDataContext";
import { useToast } from "@/hooks/use-toast";

const LANDING_STORAGE_KEY = "sarGuardian.hasEntered";

export default function SettingsPage() {
  const { systemUsers, addSystemUser } = useSARData();
  const { toast } = useToast();
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Analyst",
    status: "Active" as "Active" | "Away" | "Disabled",
  });

  const canAddUser =
    newUser.name.trim().length > 1 &&
    newUser.email.trim().includes("@") &&
    newUser.role.trim().length > 1;

  function handleAddUser() {
    if (!canAddUser) return;
    addSystemUser({
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role.trim(),
      status: newUser.status,
    });
    setNewUser({
      name: "",
      email: "",
      role: "Analyst",
      status: "Active",
    });
  }

  function handleResetIntro() {
    window.localStorage.removeItem(LANDING_STORAGE_KEY);
    toast({
      title: "Intro reset",
      description: "The welcome landing screen will be shown again.",
    });
    window.setTimeout(() => {
      window.location.assign("/");
    }, 200);
  }

  return (
    <div className="space-y-4 animate-slide-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings & Configuration</h1>
        <p className="text-sm text-muted-foreground">System configuration, user management, and compliance rules</p>
      </div>

      <div className="grid gap-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> SAR Gen AI Configuration</CardTitle>
            <CardDescription>Configure AI model endpoints and prompt templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Default Model</label>
                <Select defaultValue="claude">
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude Sonnet 3.5 (Bedrock)</SelectItem>
                    <SelectItem value="llama">Llama 3.1 70B</SelectItem>
                    <SelectItem value="mistral">Mistral 7B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Prompt Version</label>
                <Input defaultValue="v3.2.1" className="h-9" readOnly />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">Amazon Bedrock Integration</p>
                <p className="text-xs text-muted-foreground">Connected · us-east-1</p>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> SLA Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">SAR Filing Deadline</p>
                <p className="text-xs text-muted-foreground">Days after initial flag to file SAR</p>
              </div>
              <Input defaultValue="7" className="h-9 w-20 text-center" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Deadline Alerts</p>
                <p className="text-xs text-muted-foreground">Send alerts when approaching deadline</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Auto-escalation</p>
                <p className="text-xs text-muted-foreground">Escalate to Compliance Officer at 2 days remaining</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "High-risk alerts", description: "Notify immediately on risk score > 80" },
              { label: "Deadline reminders", description: "2 days before SAR filing deadline" },
              { label: "Model updates", description: "When a new AI model version is deployed" },
              { label: "Audit log exports", description: "When audit exports are downloaded" },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> User Management</CardTitle>
            <CardDescription>Add and manage investigators, analysts, and reviewers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-md bg-muted/40 border border-border">
              <Input
                placeholder="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                className="h-8"
              />
              <Input
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                className="h-8"
              />
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Analyst">Analyst</SelectItem>
                  <SelectItem value="Senior Analyst">Senior Analyst</SelectItem>
                  <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 gap-1" disabled={!canAddUser} onClick={handleAddUser}>
                <UserPlus className="w-3.5 h-3.5" /> Add User
              </Button>
            </div>

            <div className="space-y-2">
              {systemUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground">{user.role} · {user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        user.status === "Active"
                          ? "success"
                          : user.status === "Away"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {user.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">{user.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Encryption", value: "AES-256" },
                { label: "Transport", value: "TLS 1.3" },
                { label: "Audit Mode", value: "Append-only" },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Experience</CardTitle>
            <CardDescription>Control first-visit onboarding behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Reset intro screen</p>
                <p className="text-xs text-muted-foreground">Show the landing page again before entering the system.</p>
              </div>
              <Button variant="outline" onClick={handleResetIntro} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Intro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
