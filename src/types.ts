export type TemplateId = "modern-pro" | "classic" | "creative" | "minimal";

export type PersonalInfo = {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  photoData: string;
  summary: string;
};

export type EducationEntry = {
  id: string;
  institution: string;
  qualification: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type ExperienceEntry = {
  id: string;
  employer: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type CertificationEntry = {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
};

export type ProjectEntry = {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  demoUrl: string;
  repositoryUrl: string;
};

export type CVDocument = {
  id: string;
  title: string;
  template: TemplateId;
  updatedAt: string;
  personal: PersonalInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
};

export const templateOptions: { id: TemplateId; name: string; description: string }[] = [
  { id: "modern-pro", name: "Modern Pro", description: "A confident, contemporary layout with a clean blue accent." },
  { id: "classic", name: "Classic", description: "A traditional, typography-led CV for a timeless first impression." },
  { id: "creative", name: "Creative", description: "A distinctive color rail for design-minded roles and portfolios." },
  { id: "minimal", name: "Minimal", description: "A quiet, spacious layout that puts your experience first." },
];

export const emptyPersonal: PersonalInfo = {
  fullName: "",
  professionalTitle: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  photoData: "",
  summary: "",
};

export function createBlankCV(title = "Untitled CV"): CVDocument {
  return {
    id: crypto.randomUUID(),
    title,
    template: "modern-pro",
    updatedAt: new Date().toISOString(),
    personal: { ...emptyPersonal },
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    projects: [],
  };
}

export function createId(): string {
  return crypto.randomUUID();
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown, max = 6000): string =>
  typeof value === "string" ? value.slice(0, max) : "";

const asList = <T>(value: unknown, mapper: (item: unknown) => T): T[] =>
  Array.isArray(value) ? value.slice(0, 100).map(mapper) : [];

function safeEntryId(value: unknown): string {
  const id = asText(value, 100);
  return id || createId();
}

export function validateCVImport(value: unknown): CVDocument {
  if (!isRecord(value)) throw new Error("The file does not contain a CV document.");
  const source = isRecord(value.cv) ? value.cv : value;
  if (!isRecord(source.personal)) throw new Error("This file is missing its personal information section.");
  const personalSource = source.personal;
  const validTemplates: TemplateId[] = ["modern-pro", "classic", "creative", "minimal"];
  const template = validTemplates.includes(source.template as TemplateId)
    ? (source.template as TemplateId)
    : "modern-pro";
  const email = asText(personalSource.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("The CV contains an invalid email address.");
  const safeWebUrl = (candidate: unknown, label: string) => {
    const url = asText(candidate, 500);
    if (url && !isSafeExternalUrl(url)) throw new Error(`${label} must use a complete http:// or https:// URL.`);
    return url;
  };
  const photoData = asText(personalSource.photoData, 2_800_000);
  if (photoData && !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(photoData)) {
    throw new Error("The backup contains an unsupported or invalid profile photo.");
  }

  return {
    id: createId(),
    title: asText(source.title, 100) || "Imported CV",
    template,
    updatedAt: new Date().toISOString(),
    personal: {
      fullName: asText(personalSource.fullName, 120),
      professionalTitle: asText(personalSource.professionalTitle, 160),
      email,
      phone: asText(personalSource.phone, 60),
      location: asText(personalSource.location, 140),
      linkedin: safeWebUrl(personalSource.linkedin, "LinkedIn URL"),
      github: safeWebUrl(personalSource.github, "GitHub URL"),
      portfolio: safeWebUrl(personalSource.portfolio, "Portfolio URL"),
      photoData,
      summary: asText(personalSource.summary, 4000),
    },
    education: asList(source.education, (entry): EducationEntry => {
      const item = isRecord(entry) ? entry : {};
      return {
        id: safeEntryId(item.id), institution: asText(item.institution, 200), qualification: asText(item.qualification, 200),
        field: asText(item.field, 160), startDate: asText(item.startDate, 50), endDate: asText(item.endDate, 50), description: asText(item.description),
      };
    }),
    experience: asList(source.experience, (entry): ExperienceEntry => {
      const item = isRecord(entry) ? entry : {};
      return {
        id: safeEntryId(item.id), employer: asText(item.employer, 200), position: asText(item.position, 200),
        startDate: asText(item.startDate, 50), endDate: asText(item.endDate, 50), description: asText(item.description),
      };
    }),
    skills: asList(source.skills, (item) => asText(item, 120)).filter(Boolean),
    certifications: asList(source.certifications, (entry): CertificationEntry => {
      const item = isRecord(entry) ? entry : {};
      return {
        id: safeEntryId(item.id), name: asText(item.name, 200), issuer: asText(item.issuer, 200),
        date: asText(item.date, 50), credentialUrl: safeWebUrl(item.credentialUrl, "Credential URL"),
      };
    }),
    projects: asList(source.projects, (entry): ProjectEntry => {
      const item = isRecord(entry) ? entry : {};
      return {
        id: safeEntryId(item.id), name: asText(item.name, 200), description: asText(item.description),
        technologies: asList(item.technologies, (technology) => asText(technology, 100)).filter(Boolean),
        demoUrl: safeWebUrl(item.demoUrl, "Project demo URL"), repositoryUrl: safeWebUrl(item.repositoryUrl, "Repository URL"),
      };
    }),
  };
}

export function isSafeExternalUrl(raw: string): boolean {
  if (!raw.trim()) return true;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
