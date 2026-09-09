"use client";

import { useRef } from "react";

interface ResumeData {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  links?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    other?: string[];
  };
  profile_summary?: unknown;
  skills?: string[];
  languages?: string[];
  certifications?: string[];
  achievements?: string[];
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  courses?: unknown[];
}

interface ResumeExperience {
  title?: string;
  role?: string;
  position?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

interface ResumeEducation {
  degree?: string;
  course?: string;
  field?: string;
  institution?: string;
  year?: string | number;
}

const clr = {
  white: "#ffffff",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  blue600: "#2563eb",
  blue700: "#1d4ed8",
  red500: "#ef4444",
  emerald500: "#22c55e",
  emerald600: "#16a34a",
  amber500: "#f59e0b",
};

function flattenStrings(arr: unknown[]): string[] {
  const result: string[] = [];
  for (const item of arr) {
    if (typeof item === "string") {
      result.push(item);
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (Array.isArray(obj.skills)) {
        result.push(...flattenStrings(obj.skills));
      }
      if (typeof obj.name === "string") result.push(obj.name);
      if (typeof obj.category === "string") result.push(obj.category);
    }
  }
  return result;
}

export default function ResumePreview({ data }: { data: ResumeData }) {
  const ref = useRef<HTMLDivElement>(null);

  const linkItems: { label: string; url: string }[] = [];
  if (data?.links?.linkedin && typeof data.links.linkedin === "string") linkItems.push({ label: "LinkedIn", url: data.links.linkedin });
  if (data?.links?.github && typeof data.links.github === "string") linkItems.push({ label: "GitHub", url: data.links.github });
  if (data?.links?.portfolio && typeof data.links.portfolio === "string") linkItems.push({ label: "Portfolio", url: data.links.portfolio });
  if (Array.isArray(data?.links?.other)) {
    data.links.other.forEach((o) => {
      if (typeof o === "string") linkItems.push({ label: o, url: o });
    });
  }

  const summaryText =
    data?.profile_summary && typeof data.profile_summary === "string"
      ? data.profile_summary
      : data?.profile_summary
      ? JSON.stringify(data.profile_summary)
      : "";

  return (
    <div
      ref={ref}
      style={{
        background: clr.white,
        color: clr.slate900,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        maxWidth: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
      }}
    >
      <div style={{ padding: "32px 32px" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: `2px solid ${clr.slate800}`,
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          {data?.personal_info?.name && typeof data.personal_info.name === "string" && (
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: clr.slate900,
                margin: 0,
              }}
            >
              {data.personal_info.name}
            </h1>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              fontSize: "12px",
              color: clr.slate500,
              marginTop: "6px",
            }}
          >
            {data?.personal_info?.email && typeof data.personal_info.email === "string" && (
              <span>{data.personal_info.email}</span>
            )}
            {data?.personal_info?.phone && typeof data.personal_info.phone === "string" && (
              <>
                <span style={{ color: clr.slate300 }}>|</span>
                <span>{data.personal_info.phone}</span>
              </>
            )}
            {data?.personal_info?.location && typeof data.personal_info.location === "string" && (
              <>
                <span style={{ color: clr.slate300 }}>|</span>
                <span>{data.personal_info.location}</span>
              </>
            )}
          </div>
          {linkItems.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
                fontSize: "12px",
                color: clr.blue600,
                marginTop: "4px",
              }}
            >
              {linkItems.map((item, i) => (
                <span key={i}>{item.label}</span>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {summaryText && (
          <Section title="Professional Summary">
            <p style={{ fontSize: "12px", color: clr.slate700, lineHeight: "1.625", margin: 0 }}>{summaryText}</p>
          </Section>
        )}

        {/* Skills */}
        {Array.isArray(data?.skills) && data.skills.length > 0 && (
          <Section title="Skills">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {flattenStrings(data.skills).filter(Boolean).map((s, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 10px",
                    background: clr.slate100,
                    color: clr.slate800,
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "2px",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Experience */}
        {Array.isArray(data?.experience) && data.experience.length > 0 && (
          <Section title="Experience">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.experience.map((exp, i) => (
                <div key={i}>
                  {exp ? (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: clr.slate900, margin: 0 }}>
                            {typeof exp.title === "string" ? exp.title : typeof exp.role === "string" ? exp.role : typeof exp.position === "string" ? exp.position : ""}
                          </p>
                          {typeof exp.company === "string" && (
                            <p style={{ fontSize: "12px", color: clr.slate600, margin: "2px 0 0" }}>{exp.company}</p>
                          )}
                        </div>
                        {(exp.start_date || exp.end_date) && (
                          <p style={{ fontSize: "12px", color: clr.slate500, whiteSpace: "nowrap", margin: "0 0 0 8px" }}>
                            {typeof exp.start_date === "string" ? exp.start_date : ""} - {typeof exp.end_date === "string" ? exp.end_date : "Present"}
                          </p>
                        )}
                      </div>
                      {typeof exp.description === "string" && (
                        <p style={{ fontSize: "12px", color: clr.slate700, marginTop: "4px", lineHeight: "1.625", margin: 0 }}>{exp.description}</p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: "12px", color: clr.slate400, fontStyle: "italic", margin: 0 }}>Invalid entry</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Education */}
        {Array.isArray(data?.education) && data.education.length > 0 && (
          <Section title="Education">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.education.map((edu, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  {edu ? (
                    <>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: clr.slate900, margin: 0 }}>
                          {typeof edu.degree === "string" ? edu.degree : typeof edu.course === "string" ? edu.course : typeof edu.field === "string" ? edu.field : ""}
                        </p>
                        {typeof edu.institution === "string" && (
                          <p style={{ fontSize: "12px", color: clr.slate600, margin: "2px 0 0" }}>{edu.institution}</p>
                        )}
                      </div>
                      {typeof edu.year === "string" && (
                        <p style={{ fontSize: "12px", color: clr.slate500, whiteSpace: "nowrap", margin: "0 0 0 8px" }}>{edu.year}</p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: "12px", color: clr.slate400, fontStyle: "italic", margin: 0 }}>Invalid entry</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Courses */}
        {Array.isArray(data?.courses) && data.courses.length > 0 && (
          <Section title="Courses">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {flattenStrings(data.courses).filter(Boolean).map((c, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 10px",
                    background: clr.slate100,
                    color: clr.slate800,
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "2px",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Certifications */}
        {Array.isArray(data?.certifications) && data.certifications.length > 0 && (
          <Section title="Certifications">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {flattenStrings(data.certifications).filter(Boolean).map((c, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 10px",
                    background: clr.slate100,
                    color: clr.slate800,
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "2px",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Achievements */}
        {Array.isArray(data?.achievements) && data.achievements.length > 0 && (
          <Section title="Achievements">
            <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
              {flattenStrings(data.achievements).filter(Boolean).map((a, i) => (
                <li key={i} style={{ fontSize: "12px", color: clr.slate700 }}>
                  {a}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Languages */}
        {Array.isArray(data?.languages) && data.languages.length > 0 && (
          <Section title="Languages">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {flattenStrings(data.languages).filter(Boolean).map((l, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 10px",
                    background: clr.slate100,
                    color: clr.slate800,
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "2px",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2
        style={{
          fontSize: "14px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: clr.slate800,
          borderBottom: `1px solid ${clr.slate300}`,
          paddingBottom: "4px",
          marginBottom: "8px",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
