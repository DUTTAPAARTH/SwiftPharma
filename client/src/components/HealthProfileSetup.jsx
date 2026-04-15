import React, { useMemo, useState } from "react";

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const HealthProfileSetup = ({
  initialProfile = null,
  onSave,
  onSyncVault,
  loading = false,
}) => {
  const defaults = useMemo(
    () => ({
      age: initialProfile?.age ?? "",
      biologicalSex: initialProfile?.biologicalSex || "",
      bloodGroup: initialProfile?.bloodGroup || "",
      heightCm: initialProfile?.heightCm ?? "",
      weightKg: initialProfile?.weightKg ?? "",
      allergies: (initialProfile?.allergies || []).join(", "),
      chronicConditions: (initialProfile?.chronicConditions || []).join(", "),
      regularMedicines: (initialProfile?.regularMedicines || []).join(", "),
      healthGoals: (initialProfile?.healthGoals || []).join(", "),
      preferredLanguage: initialProfile?.preferredLanguage || "English",
      preferredTone: initialProfile?.preferredTone || "supportive",
      lifestyleNotes: initialProfile?.lifestyleNotes || "",
    }),
    [initialProfile],
  );

  const [form, setForm] = useState(defaults);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      age: form.age ? Number(form.age) : null,
      biologicalSex: form.biologicalSex,
      bloodGroup: form.bloodGroup,
      heightCm: form.heightCm ? Number(form.heightCm) : null,
      weightKg: form.weightKg ? Number(form.weightKg) : null,
      allergies: splitCsv(form.allergies),
      chronicConditions: splitCsv(form.chronicConditions),
      regularMedicines: splitCsv(form.regularMedicines),
      healthGoals: splitCsv(form.healthGoals),
      preferredLanguage: form.preferredLanguage,
      preferredTone: form.preferredTone,
      lifestyleNotes: form.lifestyleNotes,
    };

    await onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-200">
          Age
          <input
            name="age"
            type="number"
            min="0"
            max="120"
            value={form.age}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="text-sm font-semibold text-slate-200">
          Biological Sex
          <select
            name="biologicalSex"
            value={form.biologicalSex}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-200">
          Height (cm)
          <input
            name="heightCm"
            type="number"
            min="0"
            value={form.heightCm}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="text-sm font-semibold text-slate-200">
          Weight (kg)
          <input
            name="weightKg"
            type="number"
            min="0"
            value={form.weightKg}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-200">
        Blood Group
        <input
          name="bloodGroup"
          value={form.bloodGroup}
          onChange={onChange}
          placeholder="A+, O-, ..."
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-200">
        Allergies (comma separated)
        <input
          name="allergies"
          value={form.allergies}
          onChange={onChange}
          placeholder="penicillin, peanuts"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-200">
        Chronic Conditions (comma separated)
        <input
          name="chronicConditions"
          value={form.chronicConditions}
          onChange={onChange}
          placeholder="diabetes, hypertension"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-200">
        Regular Medicines (comma separated)
        <input
          name="regularMedicines"
          value={form.regularMedicines}
          onChange={onChange}
          placeholder="metformin 500mg, telmisartan 40mg"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-200">
        Health Goals (comma separated)
        <input
          name="healthGoals"
          value={form.healthGoals}
          onChange={onChange}
          placeholder="better sleep, better glucose control"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-200">
        Lifestyle Notes
        <textarea
          name="lifestyleNotes"
          value={form.lifestyleNotes}
          onChange={onChange}
          rows={3}
          placeholder="Work timings, activity level, meal patterns..."
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-200">
          Preferred Language
          <input
            name="preferredLanguage"
            value={form.preferredLanguage}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="text-sm font-semibold text-slate-200">
          Preferred Tone
          <select
            name="preferredTone"
            value={form.preferredTone}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            <option value="supportive">Supportive</option>
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>

        <button
          type="button"
          onClick={onSyncVault}
          disabled={loading}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60"
        >
          Sync from Vault & Prescriptions
        </button>
      </div>
    </form>
  );
};

export default HealthProfileSetup;
