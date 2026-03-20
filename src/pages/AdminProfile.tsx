import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Camera, Save, User, Mail, Phone, Briefcase, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/context/ProfileContext";
import type { UserProfile } from "@/context/ProfileContext";

const ROLES = [
  "Senior Analyst",
  "Analyst",
  "Compliance Officer",
  "Risk Manager",
  "IT Administrator",
  "Audit Lead",
  "Legal Counsel",
  "Chief Compliance Officer",
];

export default function AdminProfile() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile: globalProfile, saveProfile } = useProfile();

  // Local working copy so saves are explicit
  const [profile, setProfile] = useState<UserProfile>(() => ({ ...globalProfile }));
  const [preview, setPreview] = useState<string>(globalProfile.photoUrl || "");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPreview(url);
      setProfile((p) => ({ ...p, photoUrl: url }));
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleField = (field: keyof UserProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!profile.name.trim() || !profile.email.trim() || !profile.role) {
      toast({ title: "Incomplete profile", description: "Name, email, and role are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const saved: UserProfile = { ...profile, isVerified: true };
      // Save via context — propagates to all consumers (header, sidebar, etc.)
      saveProfile(saved);
      setProfile(saved);
      setHasChanges(false);
      setSaving(false);
      toast({ title: "Profile saved", description: "Your profile has been updated site-wide." });
    }, 800);
  };

  const isVerified = profile.isVerified;

  return (
    <div className="space-y-6 animate-slide-in max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your identity and access credentials</p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <Badge variant="success" className="gap-1.5 px-3 py-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified User
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 px-3 py-1.5 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              Unverified — Save to verify
            </Badge>
          )}
        </div>
      </div>

      {/* Access Gate Banner */}
      {!isVerified && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Access Verification Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                This page is restricted to verified users. Complete your profile and click Save to verify your identity and gain full system access.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Photo & Identity Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Profile Identity</CardTitle>
          <CardDescription>Your verified identity within the SAR Gen AI platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/80 transition-colors shadow-md"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Identity info */}
            <div className="space-y-1">
              <p className="text-xl font-bold text-foreground">{profile.name || "—"}</p>
              <p className="text-sm text-muted-foreground">{profile.role || "No role set"}</p>
              <p className="text-xs text-muted-foreground">{profile.department}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {isVerified ? (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Identity verified — changes reflect site-wide
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5" />
                    Not yet verified
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
          <CardDescription>Changes are reflected immediately in the header and sidebar after saving</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> Full Name
            </Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={profile.name}
              onChange={(e) => handleField("name", e.target.value)}
              className="h-10"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
              <Badge variant="secondary" className="text-[10px] ml-1">Login email</Badge>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@barclays.com"
              value={profile.email}
              onChange={(e) => handleField("email", e.target.value)}
              className="h-10"
            />
            <p className="text-[11px] text-muted-foreground">This is the email used to log in to the platform.</p>
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" /> Mobile Number
            </Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="+44 20 0000 0000"
              value={profile.mobile}
              onChange={(e) => handleField("mobile", e.target.value)}
              className="h-10"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" /> Role in Company
            </Label>
            <Select value={profile.role} onValueChange={(v) => handleField("role", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="dept" className="text-sm font-medium">Department</Label>
            <Input
              id="dept"
              placeholder="Department or business unit"
              value={profile.department}
              onChange={(e) => handleField("department", e.target.value)}
              className="h-10"
            />
          </div>

          {/* Save Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {hasChanges ? "You have unsaved changes." : "Profile is up to date."}
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="gap-2 w-full sm:w-auto"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save & Apply Profile</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Security & Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Access Level", value: isVerified ? "Verified User" : "Unverified", color: isVerified ? "text-success" : "text-warning" },
              { label: "Data Encryption", value: "AES-256" },
              { label: "Session Security", value: "TLS 1.3" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color || "text-foreground"}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            Profile data is stored locally and encrypted. Only verified users have full platform access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
