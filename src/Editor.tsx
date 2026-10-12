import { useId, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Download, FileImage, Plus, Printer, Trash2, X } from "lucide-react";
import { CVPreview } from "./CVPreview";
import type { CVDocument, CertificationEntry, EducationEntry, ExperienceEntry, ProjectEntry } from "./types";
import { createId, isSafeExternalUrl, templateOptions } from "./types";

type EditorProps = {
  cv: CVDocument;
  saved: boolean;
  saveError: string;
  onChange: (cv: CVDocument) => void;
  onBack: () => void;
  onDownload: () => void;
  onPrint: () => void;
};

type EntryProps<T extends { id: string }> = {
  title: string;
  hint: string;
  entries: T[];
  createEntry: () => T;
  onChange: (entries: T[]) => void;
  renderEntry: (entry: T, update: (patch: Partial<T>) => void) => ReactNode;
};

function EntrySection<T extends { id: string }>({ title, hint, entries, createEntry, onChange, renderEntry }: EntryProps<T>) {
  const updateEntry = (id: string, patch: Partial<T>) => onChange(entries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  const removeEntry = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const moveEntry = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return;
    const next = [...entries];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <section className="editor-section">
      <div className="editor-section-heading"><div><h2>{title}</h2><p>{hint}</p></div><button className="button button-small button-outline" type="button" onClick={() => onChange([...entries, createEntry()])}><Plus size={15} /> Add</button></div>
      {entries.length === 0 ? <div className="empty-entry">Nothing here yet. Add an entry when you’re ready.</div> : entries.map((entry, index) => (
        <fieldset className="entry-card" key={entry.id}>
          <legend className="sr-only">{title} entry {index + 1}</legend>
          <div className="entry-tools">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <button type="button" aria-label={`Move ${title} entry up`} disabled={index === 0} onClick={() => moveEntry(index, -1)}><ArrowUp size={15} /></button>
            <button type="button" aria-label={`Move ${title} entry down`} disabled={index === entries.length - 1} onClick={() => moveEntry(index, 1)}><ArrowDown size={15} /></button>
            <button type="button" aria-label={`Delete ${title} entry ${index + 1}`} onClick={() => removeEntry(entry.id)}><Trash2 size={15} /></button>
          </div>
          <div className="entry-fields">{renderEntry(entry, (patch) => updateEntry(entry.id, patch))}</div>
        </fieldset>
      ))}
    </section>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text", multiline = false, rows = 4, maxLength, hint }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; multiline?: boolean; rows?: number; maxLength?: number; hint?: string;
}) {
  const [touched, setTouched] = useState(false);
  const reactId = useId();
  const isUrl = type === "url";
  const valid = !value || (type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : !isUrl || isSafeExternalUrl(value));
  const error = touched && !valid ? (type === "email" ? "Enter a valid email address." : "Use a complete http:// or https:// link.") : "";
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${reactId.replace(/:/g, "")}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    value,
    placeholder,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    onBlur: () => setTouched(true),
  };

  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} type={type} />}
      {hint && <small id={`${id}-hint`} className="field-hint">{hint}</small>}
      {error && <small id={`${id}-error`} className="field-error-text">{error}</small>}
    </div>
  );
}

function PhotoField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const processPhoto = async (file?: File) => {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image smaller than 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      onChange(canvas.toDataURL("image/jpeg", 0.82));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This image could not be processed.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="photo-field" aria-busy={busy}><span className="field-label">Profile photo <span className="optional">Optional</span></span><div className="photo-control">{value ? <img src={value} alt="Selected profile photo" /> : <span className="photo-placeholder"><FileImage size={18} /></span>}<label className="button button-small button-outline upload-button">{busy ? "Processing…" : value ? "Replace photo" : "Upload photo"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { void processPhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>{value && <button className="icon-button" type="button" aria-label="Remove profile photo" onClick={() => onChange("")}><X size={16} /></button>}</div><small className="field-hint">JPG, PNG, or WebP · up to 2 MB. Processed on this device.</small>{error && <small className="field-error-text" role="alert">{error}</small>}</div>;
}

export function Editor({ cv, saved, saveError, onChange, onBack, onDownload, onPrint }: EditorProps) {
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const updatePersonal = (key: keyof CVDocument["personal"], value: string) => onChange({ ...cv, personal: { ...cv.personal, [key]: value } });
  const update = <K extends keyof CVDocument>(key: K, value: CVDocument[K]) => onChange({ ...cv, [key]: value });
  const [skillsText, setSkillsText] = useState(cv.skills.join(", "));

  return (
    <div className="editor-screen">
      <header className="editor-toolbar">
        <div className="toolbar-left"><button type="button" className="icon-button back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={18} /></button><div className="toolbar-document"><span className="toolbar-label">EDITING CV</span><input aria-label="CV title" value={cv.title} maxLength={100} onChange={(event) => onChange({ ...cv, title: event.target.value })} /></div></div>
        <div className="save-state" aria-live="polite"><span className={`save-dot ${saved && !saveError ? "is-saved" : ""}`} />{saveError ? "Save issue" : saved ? "Saved on this device" : "Saving…"}</div>
        <div className="toolbar-actions"><button className="button button-outline toolbar-print" type="button" onClick={onPrint}><Printer size={15} /> Print</button><button className="button button-primary" type="button" onClick={onDownload}><Download size={15} /> Download PDF</button></div>
      </header>
      {saveError && <div className="save-error" role="alert">{saveError}</div>}
      <div className="mobile-editor-tabs" role="group" aria-label="Editor view"><button type="button" aria-pressed={mobileView === "edit"} onClick={() => setMobileView("edit")}>Edit details</button><button type="button" aria-pressed={mobileView === "preview"} onClick={() => setMobileView("preview")}>Preview</button></div>
      <div className={`editor-layout mobile-${mobileView}`}>
        <main className="editor-form">
          <div className="editor-intro"><span className="eyebrow">YOUR CV, YOUR STORY</span><h1>Let’s fill in<br />the <em>good stuff.</em></h1><p>Add what you know now. You can always come back and refine it later.</p></div>
          <section className="editor-section personal-section">
            <div className="editor-section-heading"><div><span className="section-number">01</span><h2>Personal details</h2><p>How should people get to know you?</p></div></div>
            <div className="form-grid">
              <TextField label="Full name" value={cv.personal.fullName} onChange={(v) => updatePersonal("fullName", v)} placeholder="e.g. Jordan Taylor" maxLength={120} />
              <TextField label="Professional title" value={cv.personal.professionalTitle} onChange={(v) => updatePersonal("professionalTitle", v)} placeholder="e.g. Product Designer" maxLength={160} />
              <TextField label="Email address" type="email" value={cv.personal.email} onChange={(v) => updatePersonal("email", v)} placeholder="you@example.com" maxLength={254} />
              <TextField label="Phone number" type="tel" value={cv.personal.phone} onChange={(v) => updatePersonal("phone", v)} placeholder="+1 555 0100" maxLength={60} />
              <TextField label="Location" value={cv.personal.location} onChange={(v) => updatePersonal("location", v)} placeholder="City, Country" maxLength={140} />
              <PhotoField value={cv.personal.photoData} onChange={(v) => updatePersonal("photoData", v)} />
              <TextField label="LinkedIn URL" type="url" value={cv.personal.linkedin} onChange={(v) => updatePersonal("linkedin", v)} placeholder="https://linkedin.com/in/you" maxLength={500} />
              <TextField label="GitHub URL" type="url" value={cv.personal.github} onChange={(v) => updatePersonal("github", v)} placeholder="https://github.com/you" maxLength={500} />
              <TextField label="Portfolio URL" type="url" value={cv.personal.portfolio} onChange={(v) => updatePersonal("portfolio", v)} placeholder="https://yourwebsite.com" maxLength={500} />
              <div className="field-span"><TextField label="Professional summary" value={cv.personal.summary} onChange={(v) => updatePersonal("summary", v)} placeholder="A few clear sentences about what you do, what you’re good at, and the kind of work you want to do next." multiline rows={5} maxLength={4000} hint="A concise, specific summary works best. This appears at the top of your CV." /></div>
            </div>
          </section>

          <EntrySection<EducationEntry> title="Education" hint="Degrees, courses, and other learning." entries={cv.education} onChange={(value) => update("education", value)} createEntry={() => ({ id: createId(), institution: "", qualification: "", field: "", startDate: "", endDate: "", description: "" })} renderEntry={(entry, patch) => <>
            <TextField label="Institution" value={entry.institution} onChange={(v) => patch({ institution: v })} placeholder="School or institution" maxLength={200} />
            <TextField label="Qualification" value={entry.qualification} onChange={(v) => patch({ qualification: v })} placeholder="e.g. B.Sc. Computer Science" maxLength={200} />
            <TextField label="Field of study" value={entry.field} onChange={(v) => patch({ field: v })} placeholder="e.g. Computer Science" maxLength={160} />
            <TextField label="Start date" value={entry.startDate} onChange={(v) => patch({ startDate: v })} placeholder="e.g. Sep 2022" maxLength={50} />
            <TextField label="End date" value={entry.endDate} onChange={(v) => patch({ endDate: v })} placeholder="e.g. Jun 2026 or Present" maxLength={50} />
            <div className="field-span"><TextField label="Details" value={entry.description} onChange={(v) => patch({ description: v })} placeholder="Relevant coursework, honors, or activities" multiline rows={3} maxLength={3000} /></div>
          </>} />

          <EntrySection<ExperienceEntry> title="Experience" hint="Employment, internships, volunteering, and achievements." entries={cv.experience} onChange={(value) => update("experience", value)} createEntry={() => ({ id: createId(), employer: "", position: "", startDate: "", endDate: "", description: "" })} renderEntry={(entry, patch) => <>
            <TextField label="Position" value={entry.position} onChange={(v) => patch({ position: v })} placeholder="Your role" maxLength={200} />
            <TextField label="Employer or organization" value={entry.employer} onChange={(v) => patch({ employer: v })} placeholder="Company or organization" maxLength={200} />
            <TextField label="Start date" value={entry.startDate} onChange={(v) => patch({ startDate: v })} placeholder="e.g. Jan 2024" maxLength={50} />
            <TextField label="End date" value={entry.endDate} onChange={(v) => patch({ endDate: v })} placeholder="e.g. Dec 2024 or Present" maxLength={50} />
            <div className="field-span"><TextField label="What you did" value={entry.description} onChange={(v) => patch({ description: v })} placeholder="Describe your contribution, impact, and the tools you used." multiline rows={4} maxLength={4000} /></div>
          </>} />

          <section className="editor-section">
            <div className="editor-section-heading"><div><span className="section-number">04</span><h2>Skills</h2><p>Make the strengths relevant to your next role easy to spot.</p></div></div>
            <TextField label="Skills, separated by commas" value={skillsText} onChange={(value) => { const skills = Array.from(new Set(value.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean))); setSkillsText(value); update("skills", skills); }} placeholder="JavaScript, Research, Communication" multiline rows={3} maxLength={3000} hint="Use commas or new lines to separate each skill." />
          </section>

          <EntrySection<CertificationEntry> title="Certifications" hint="Professional credentials, courses, and licenses." entries={cv.certifications} onChange={(value) => update("certifications", value)} createEntry={() => ({ id: createId(), name: "", issuer: "", date: "", credentialUrl: "" })} renderEntry={(entry, patch) => <>
            <TextField label="Certification or course" value={entry.name} onChange={(v) => patch({ name: v })} placeholder="Credential name" maxLength={200} />
            <TextField label="Issuing organization" value={entry.issuer} onChange={(v) => patch({ issuer: v })} placeholder="Organization" maxLength={200} />
            <TextField label="Completion date" value={entry.date} onChange={(v) => patch({ date: v })} placeholder="e.g. May 2025" maxLength={50} />
            <div className="field-span"><TextField label="Credential URL" type="url" value={entry.credentialUrl} onChange={(v) => patch({ credentialUrl: v })} placeholder="https://..." maxLength={500} /></div>
          </>} />

          <EntrySection<ProjectEntry> title="Projects" hint="Show work that demonstrates your skills." entries={cv.projects} onChange={(value) => update("projects", value)} createEntry={() => ({ id: createId(), name: "", description: "", technologies: [], demoUrl: "", repositoryUrl: "" })} renderEntry={(entry, patch) => <>
            <TextField label="Project name" value={entry.name} onChange={(v) => patch({ name: v })} placeholder="Project name" maxLength={200} />
            <TextField label="Technologies" value={entry.technologies.join(", ")} onChange={(v) => patch({ technologies: v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) })} placeholder="React, TypeScript, Node.js" maxLength={1000} />
            <TextField label="Live demo URL" type="url" value={entry.demoUrl} onChange={(v) => patch({ demoUrl: v })} placeholder="https://..." maxLength={500} />
            <TextField label="Repository URL" type="url" value={entry.repositoryUrl} onChange={(v) => patch({ repositoryUrl: v })} placeholder="https://github.com/..." maxLength={500} />
            <div className="field-span"><TextField label="Description" value={entry.description} onChange={(v) => patch({ description: v })} placeholder="What does it do, and what did you contribute?" multiline rows={4} maxLength={3500} /></div>
          </>} />

          <div className="editor-bottom"><span>All changes are stored in this browser.</span><button className="button button-primary" type="button" onClick={onBack}>Done editing <ArrowLeft size={15} className="icon-flip" /></button></div>
        </main>
        <aside className="preview-column" aria-label="Live CV preview"><div className="preview-heading"><div><span className="eyebrow">LIVE PREVIEW</span><h2>{cv.title || "Untitled CV"}</h2></div><label className="template-select-label">Template<select value={cv.template} onChange={(event) => update("template", event.target.value as CVDocument["template"])}>{templateOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label></div><CVPreview cv={cv} /></aside>
      </div>
      <div className="mobile-export-bar"><button type="button" className="button button-outline" onClick={onPrint}><Printer size={15} /> Print</button><button type="button" className="button button-primary" onClick={onDownload}><Download size={15} /> Download PDF</button></div>
    </div>
  );
}
