import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileOutput, FileText, FolderOpen, LayoutTemplate, LockKeyhole, Menu, Settings2, ShieldCheck, X } from "lucide-react";
import { Editor } from "./Editor";
import { Dashboard, Landing, PreviewExportPage, SettingsPage, TemplatesPage } from "./Pages";
import { downloadCVPdf } from "./exportPdf";
import { cvStore } from "./storage";
import { createBlankCV, templateOptions, validateCVImport } from "./types";
import type { CVDocument, TemplateId } from "./types";

type Page = "landing" | "dashboard" | "editor" | "preview" | "templates" | "settings";
type SaveState = "saved" | "saving" | "error";

function saveJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function fileName(value: string) {
  return (value || "careerfy-backup").normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "careerfy-backup";
}

function validateImportedDocuments(value: unknown): CVDocument[] {
  if (typeof value === "object" && value !== null && "documents" in value) {
    const backup = value as { app?: unknown; version?: unknown; documents?: unknown };
    if (backup.app !== "Careerfy" || backup.version !== 1 || !Array.isArray(backup.documents)) {
      throw new Error("This file is not a supported Careerfy backup.");
    }
    if (backup.documents.length === 0) throw new Error("This backup does not contain any CVs.");
    if (backup.documents.length > 100) throw new Error("A backup can contain up to 100 CVs at a time.");
    return backup.documents.map(validateCVImport);
  }
  return [validateCVImport(value)];
}

function AppNavigation({ page, setPage, onCreate, mobileOpen, setMobileOpen }: {
  page: Page; setPage: (page: Page) => void; onCreate: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void;
}) {
  const navigate = (target: Page) => { setPage(target); setMobileOpen(false); };
  const items: { id: Page; label: string; icon: typeof FileText }[] = [
    { id: "dashboard", label: "My CVs", icon: FolderOpen },
    { id: "templates", label: "Templates", icon: LayoutTemplate },
    { id: "preview", label: "Preview & export", icon: FileOutput },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];
  return <>
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Careerfy workspace">
      <div className="sidebar-top"><button className="brand" onClick={() => navigate("dashboard")}><span className="brand-symbol">c.</span><span>careerfy</span></button><button className="sidebar-mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="workspace-nav" aria-label="Workspace navigation">{items.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={page === id ? "is-active" : ""} aria-current={page === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === "preview" && <span className="nav-arrow">↗</span>}</button>)}</nav>
      <button className="sidebar-create" type="button" onClick={() => { setMobileOpen(false); onCreate(); }}><span>+</span> Create a CV</button>
      <div className="sidebar-bottom"><div className="sidebar-privacy"><ShieldCheck size={16} /><span>Your CVs stay<br />on this device.</span></div><button type="button" className="sidebar-back" onClick={() => navigate("landing")}><ArrowLeft size={14} /> Back to Careerfy</button><span className="sidebar-version">CAREERFY · MVP 1.0</span></div>
    </aside>
  </>;
}

export default function App() {
  const [documents, setDocuments] = useState<CVDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("landing");
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("careerfy-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const skipThemePersist = useRef(false);
  const activeCV = useMemo(() => documents.find((doc) => doc.id === activeId) ?? null, [documents, activeId]);

  useEffect(() => {
    let cancelled = false;
    cvStore.all().then((stored) => {
      if (!cancelled) { setDocuments(stored); setReady(true); }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setStorageError(error instanceof Error ? error.message : "Careerfy could not read local browser storage.");
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (skipThemePersist.current) { skipThemePersist.current = false; return; }
    try { localStorage.setItem("careerfy-theme", theme); } catch { /* Theme can still be used for this session. */ }
  }, [theme]);

  useEffect(() => {
    if (page !== "editor" || !activeCV || !ready) return;
    setSaveState("saving");
    setSaveError("");
    const timeout = window.setTimeout(() => {
      cvStore.put(activeCV).then(() => {
        setSaveState("saved");
        setSaveError("");
        setDocuments((current) => [...current].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      }).catch((error: unknown) => {
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Your changes could not be saved. Export a backup before closing this tab.");
      });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [activeCV, page, ready]);

  useEffect(() => {
    if (page !== "editor" || !activeCV) return;
    const flushPendingSave = () => {
      void cvStore.put(activeCV).catch((error: unknown) => {
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Your changes could not be saved.");
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };
    window.addEventListener("pagehide", flushPendingSave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeCV, page]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const persist = async (doc: CVDocument) => {
    try {
      await cvStore.put(doc);
      setDocuments((current) => {
        const next = current.some((item) => item.id === doc.id) ? current.map((item) => item.id === doc.id ? doc : item) : [doc, ...current];
        return [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setSaveState("saved");
      setSaveError("");
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Could not save this CV on your device.");
      setToast("Could not save that change. Please export a backup before leaving.");
      return false;
    }
  };

  const createDocument = (template: TemplateId = "modern-pro") => {
    const next = createBlankCV(documents.length ? `My CV ${documents.length + 1}` : "My CV");
    next.template = template;
    setDocuments((current) => [next, ...current]);
    setActiveId(next.id);
    setSaveState("saving");
    setPage("editor");
    void persist(next);
  };

  const updateActive = (updated: CVDocument) => {
    const next = { ...updated, updatedAt: new Date().toISOString() };
    setDocuments((current) => current.map((doc) => doc.id === next.id ? next : doc));
    setSaveState("saving");
  };

  const openEditor = (doc: CVDocument) => { setDocuments((current) => current.some((item) => item.id === doc.id) ? current : [doc, ...current]); setActiveId(doc.id); setPage("editor"); };
  const openPreview = (doc: CVDocument) => { setDocuments((current) => current.some((item) => item.id === doc.id) ? current : [doc, ...current]); setActiveId(doc.id); setPage("preview"); };

  const duplicateDocument = async (doc: CVDocument) => {
    const copy = structuredClone(doc);
    copy.id = crypto.randomUUID();
    copy.title = `${doc.title || "Untitled CV"} copy`;
    copy.updatedAt = new Date().toISOString();
    [...copy.education, ...copy.experience, ...copy.certifications, ...copy.projects].forEach((entry) => { entry.id = crypto.randomUUID(); });
    if (await persist(copy)) setToast("CV duplicated.");
  };

  const renameDocument = async (doc: CVDocument) => {
    const value = window.prompt("Give this CV a name", doc.title);
    if (value === null) return;
    const title = value.trim().slice(0, 100);
    if (!title) { setToast("A CV name can’t be empty."); return; }
    if (await persist({ ...doc, title, updatedAt: new Date().toISOString() })) setToast("CV renamed.");
  };

  const deleteDocument = async (doc: CVDocument) => {
    if (!window.confirm(`Delete “${doc.title || "Untitled CV"}”? This cannot be undone unless you have a backup.`)) return;
    try {
      await cvStore.remove(doc.id);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
      if (activeId === doc.id) { setActiveId(null); setPage("dashboard"); }
      setToast("CV deleted from this browser.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not delete that CV.");
    }
  };

  const exportOne = (doc: CVDocument) => {
    try {
      saveJson(`${fileName(doc.title)}-careerfy.json`, { app: "Careerfy", version: 1, exportedAt: new Date().toISOString(), cv: doc });
      setToast("CV backup downloaded.");
    } catch { setToast("Could not create the JSON backup."); }
  };

  const exportAll = () => {
    try {
      saveJson("careerfy-backup.json", { app: "Careerfy", version: 1, exportedAt: new Date().toISOString(), documents });
      setToast("Your Careerfy backup is ready.");
    } catch { setToast("Could not create the backup file."); }
  };

  const importFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setToast("Choose a JSON backup smaller than 10 MB."); return; }
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") { setToast("Choose a .json backup file."); return; }
    try {
      const contents: unknown = JSON.parse(await file.text());
      const imported = validateImportedDocuments(contents);
      await cvStore.putMany(imported);
      const saved = imported;
      setDocuments((current) => [...saved, ...current].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setActiveId(saved[0].id);
      setPage("editor");
      setToast(`${saved.length} ${saved.length === 1 ? "CV" : "CVs"} imported. Review your details before using them.`);
    } catch (error) {
      setToast(error instanceof Error ? `Import failed: ${error.message}` : "Import failed. This file does not look like a Careerfy backup.");
    }
  };

  const printCV = () => window.print();
  const downloadPDF = (doc: CVDocument | null = activeCV) => {
    if (!doc) { setToast("Open a CV before exporting it."); return; }
    try { downloadCVPdf(doc); setToast("Your PDF download has started."); }
    catch (error) { setToast(error instanceof Error ? `PDF export failed: ${error.message}` : "PDF export failed. Try printing to PDF instead."); }
  };

  const selectTemplate = (template: TemplateId) => {
    if (!activeCV) { createDocument(template); return; }
    updateActive({ ...activeCV, template });
    setPage("editor");
    setToast(`${templateOptions.find((option) => option.id === template)?.name} template selected.`);
  };

  const clearData = async () => {
    if (!window.confirm("Delete every Careerfy CV saved in this browser? This cannot be undone unless you have a backup.")) return;
    try {
      await cvStore.clear();
      setDocuments([]); setActiveId(null); setPage("dashboard");
      try { localStorage.removeItem("careerfy-theme"); } catch { /* Clearing CVs is still successful. */ }
      if (theme !== "light") skipThemePersist.current = true;
      setTheme("light"); setToast("All Careerfy CVs have been cleared from this browser.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Could not clear Careerfy data."); }
  };

  if (!ready) return <div className="loading-screen"><div className="loading-mark">c.</div><span>Opening your workspace…</span></div>;

  if (page === "landing") return <div data-theme={theme}><Landing onStart={() => createDocument()} onTemplates={() => setPage("templates")} onDashboard={() => setPage("dashboard")} hasDocuments={documents.length > 0} />{toast && <div className="toast" role="status">{toast}</div>}</div>;

  if (page === "editor" && activeCV) return <div className="app-frame editor-frame" data-theme={theme}><Editor key={activeCV.id} cv={activeCV} saved={saveState === "saved"} saveError={saveError} onChange={updateActive} onBack={() => { void persist(activeCV); setPage("dashboard"); }} onDownload={() => downloadPDF(activeCV)} onPrint={printCV} />{toast && <div className="toast" role="status">{toast}</div>}</div>;

  return <div className="app-frame" data-theme={theme}>
    <AppNavigation page={page} setPage={setPage} onCreate={() => createDocument()} mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />
    <div className="workspace-main"><header className="workspace-topbar"><button className="mobile-menu-button" type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(!mobileNavOpen)}><Menu size={20} /></button><button className="topbar-back" type="button" onClick={() => setPage("landing")}><span className="brand-symbol">c.</span><span>Careerfy</span></button><div className="topbar-right"><span><LockKeyhole size={13} /> Private workspace</span>{activeCV && <button type="button" onClick={() => setPage("editor")}><FileText size={15} /> {activeCV.title}</button>}</div></header>
      {storageError && <div className="storage-warning" role="alert"><ShieldCheck size={17} /><span>{storageError} Your changes may not persist in this browser.</span><button type="button" aria-label="Dismiss warning" onClick={() => setStorageError("")}>×</button></div>}
      {page === "dashboard" && <Dashboard documents={documents} activeId={activeId} onCreate={() => createDocument()} onEdit={openEditor} onPreview={openPreview} onRename={(doc) => void renameDocument(doc)} onDuplicate={(doc) => void duplicateDocument(doc)} onDelete={(doc) => void deleteDocument(doc)} onExport={exportOne} onImport={(file) => void importFile(file)} />}
      {page === "templates" && <TemplatesPage selected={activeCV?.template ?? "modern-pro"} onChoose={selectTemplate} />}
      {page === "settings" && <SettingsPage theme={theme} saved={saveState === "saved"} saveError={saveError} onTheme={setTheme} onExport={exportAll} onImport={(file) => void importFile(file)} onClear={() => void clearData()} />}
      {page === "preview" && (activeCV ? <PreviewExportPage cv={activeCV} onEdit={() => setPage("editor")} onDownload={() => downloadPDF(activeCV)} onPrint={printCV} /> : <div className="page-content preview-empty"><div className="empty-illustration"><FileOutput size={31} /></div><h1>No CV to preview yet.</h1><p>Create or open a CV to preview and export it.</p><button className="button button-primary" onClick={() => createDocument()}>Create a CV</button></div>)}
    </div>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
