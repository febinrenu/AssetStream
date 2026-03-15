"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { useAuth, useUpdateProfile } from "@/hooks/useAuth";

const AVATAR_COLORS = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

export default function ProfilePage() {
  const { data: user } = useAuth();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [avatarColor, setAvatarColor] = useState(
    user?.avatar_color || AVATAR_COLORS[0]
  );
  const [saved, setSaved] = useState(false);

  const avatarInitial = `${firstName?.[0] || user?.username?.[0] || "?"}${lastName?.[0] || ""}`.toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { first_name: firstName, last_name: lastName, phone_number: phone, avatar_color: avatarColor },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
      >
        {/* Cover gradient */}
        <div
          className="h-28 w-full"
          style={{
            background: `linear-gradient(135deg, ${avatarColor}55 0%, ${avatarColor}22 100%)`,
          }}
        />

        {/* Avatar + name */}
        <div className="flex flex-col items-start gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div
            className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg ring-4 ring-[var(--surface)]"
            style={{ background: avatarColor }}
          >
            {avatarInitial}
          </div>
          <div className="mb-1">
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
              {firstName || lastName
                ? `${firstName} ${lastName}`.trim()
                : user?.username}
            </h2>
            <p className="text-[13px] capitalize text-[var(--text-muted)]">
              {user?.username} · {user?.role}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6"
      >
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Personal Information</h3>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">Update your visible profile details</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              className="input-field"
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rivera"
              className="input-field"
            />
          </Field>
          <Field label="Username">
            <div className="flex items-center gap-2 input-field bg-[var(--surface-muted)] cursor-not-allowed">
              <Lock size={12} className="text-[var(--text-faint)]" />
              <span className="text-[var(--text-muted)] text-[13px]">{user?.username}</span>
            </div>
          </Field>
          <Field label="Role">
            <div className="flex items-center gap-2 input-field bg-[var(--surface-muted)] cursor-not-allowed capitalize">
              <Lock size={12} className="text-[var(--text-faint)]" />
              <span className="text-[var(--text-muted)] text-[13px] capitalize">{user?.role}</span>
            </div>
          </Field>
          <Field label="Phone Number">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="input-field"
            />
          </Field>
          <Field label="Email">
            <div className="flex items-center gap-2 input-field bg-[var(--surface-muted)] cursor-not-allowed">
              <Lock size={12} className="text-[var(--text-faint)]" />
              <span className="text-[var(--text-muted)] text-[13px]">{user?.email || "—"}</span>
            </div>
          </Field>
        </div>

        {/* Avatar color picker */}
        <div>
          <p className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">Avatar Color</p>
          <div className="flex flex-wrap gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                className="relative h-9 w-9 rounded-xl transition-transform hover:scale-110"
                style={{ background: c }}
                title={c}
              >
                {avatarColor === c && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-white drop-shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          {saved && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)]"
            >
              <CheckCircle2 size={14} />
              Changes saved!
            </motion.p>
          )}
          {!saved && <span />}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_var(--accent-glow)] transition-all hover:opacity-90 disabled:opacity-60"
          >
            {updateProfile.isPending && <Loader2 size={13} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}
