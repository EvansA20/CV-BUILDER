import type { ReactNode } from "react";
import type { CVDocument } from "./types";
import { isSafeExternalUrl } from "./types";

type Props = { cv: CVDocument; className?: string };

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  if (!href || !isSafeExternalUrl(href)) return null;
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export function CVPreview({ cv, className = "" }: Props) {
  const { personal } = cv;
  const profileLinks = [
    ["LinkedIn", personal.linkedin],
    ["GitHub", personal.github],
    ["Portfolio", personal.portfolio],
  ].filter(([, value]) => value && isSafeExternalUrl(value)) as [string, string][];

  return (
    <article className={`resume-paper cv-${cv.template} ${className}`} aria-label={`CV preview for ${personal.fullName || "your name"}`}>
      <header className="resume-header">
        {personal.photoData && <img className="resume-photo" src={personal.photoData} alt="Profile photo" />}
        <div className="resume-heading">
          <h1>{personal.fullName || "Your Name"}</h1>
          {personal.professionalTitle && <p className="resume-title">{personal.professionalTitle}</p>}
        </div>
        <div className="resume-contact">
          {personal.email && <a href={`mailto:${personal.email}`}>{personal.email}</a>}
          {personal.phone && <a href={`tel:${personal.phone.replace(/[^\d+]/g, "")}`}>{personal.phone}</a>}
          {personal.location && <span>{personal.location}</span>}
          {profileLinks.map(([label, href]) => <ExternalLink key={label} href={href}>{label}</ExternalLink>)}
        </div>
      </header>

      {personal.summary && <section className="resume-section"><h2>Profile</h2><p className="resume-body preserve-lines">{personal.summary}</p></section>}

      {cv.experience.some((item) => item.position || item.employer || item.description) && (
        <section className="resume-section">
          <h2>Experience</h2>
          {cv.experience.filter((item) => item.position || item.employer || item.description).map((item) => (
            <div className="resume-entry" key={item.id}>
              <div className="resume-entry-heading"><h3>{item.position || "Position"}</h3><span>{[item.startDate, item.endDate].filter(Boolean).join(" — ")}</span></div>
              {item.employer && <p className="resume-entry-subtitle">{item.employer}</p>}
              {item.description && <p className="resume-body preserve-lines">{item.description}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.education.some((item) => item.qualification || item.institution || item.description) && (
        <section className="resume-section">
          <h2>Education</h2>
          {cv.education.filter((item) => item.qualification || item.institution || item.description).map((item) => (
            <div className="resume-entry" key={item.id}>
              <div className="resume-entry-heading"><h3>{item.qualification || "Qualification"}</h3><span>{[item.startDate, item.endDate].filter(Boolean).join(" — ")}</span></div>
              {(item.institution || item.field) && <p className="resume-entry-subtitle">{[item.institution, item.field].filter(Boolean).join(" · ")}</p>}
              {item.description && <p className="resume-body preserve-lines">{item.description}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.skills.length > 0 && <section className="resume-section"><h2>Skills</h2><ul className="resume-skills">{cv.skills.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul></section>}

      {cv.certifications.some((item) => item.name) && (
        <section className="resume-section">
          <h2>Certifications</h2>
          {cv.certifications.filter((item) => item.name).map((item) => (
            <div className="resume-entry resume-entry-inline" key={item.id}>
              <div className="resume-entry-heading"><h3>{item.name}</h3><span>{item.date}</span></div>
              {item.issuer && <p className="resume-entry-subtitle">{item.issuer}</p>}
              {item.credentialUrl && <ExternalLink href={item.credentialUrl}>View credential ↗</ExternalLink>}
            </div>
          ))}
        </section>
      )}

      {cv.projects.some((item) => item.name || item.description) && (
        <section className="resume-section">
          <h2>Projects</h2>
          {cv.projects.filter((item) => item.name || item.description).map((item) => (
            <div className="resume-entry" key={item.id}>
              <div className="resume-entry-heading"><h3>{item.name || "Project"}</h3><span className="resume-project-links"><ExternalLink href={item.demoUrl}>Live demo ↗</ExternalLink><ExternalLink href={item.repositoryUrl}>Repository ↗</ExternalLink></span></div>
              {item.description && <p className="resume-body preserve-lines">{item.description}</p>}
              {item.technologies.length > 0 && <p className="resume-entry-subtitle">{item.technologies.join(" · ")}</p>}
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
