import { describe, expect, it } from "vitest";
import { createBlankCV, isSafeExternalUrl, validateCVImport } from "./types";

describe("CV data operations", () => {
  it("creates independent CVs with stable IDs and all supported sections", () => {
    const first = createBlankCV("First CV");
    const second = createBlankCV("Second CV");

    expect(first.id).not.toBe(second.id);
    expect(first.title).toBe("First CV");
    expect(first.education).toEqual([]);
    expect(first.experience).toEqual([]);
    expect(first.skills).toEqual([]);
    expect(first.certifications).toEqual([]);
    expect(first.projects).toEqual([]);
  });

  it("normalizes a valid backup and assigns it a fresh document ID", () => {
    const original = createBlankCV("My portfolio CV");
    original.personal.fullName = "Jordan Taylor";
    original.personal.linkedin = "https://www.linkedin.com/in/jordan";
    original.skills = ["Research", "Writing"];
    const imported = validateCVImport(original);

    expect(imported.id).not.toBe(original.id);
    expect(imported.personal.fullName).toBe("Jordan Taylor");
    expect(imported.personal.linkedin).toBe("https://www.linkedin.com/in/jordan");
    expect(imported.skills).toEqual(["Research", "Writing"]);
    expect(imported.template).toBe(original.template);
  });

  it("rejects executable and malformed external links", () => {
    expect(isSafeExternalUrl("https://example.com/profile")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,hello")).toBe(false);
    expect(isSafeExternalUrl("https://user:password@example.com")).toBe(false);
    expect(() => validateCVImport({ personal: { fullName: "A", portfolio: "javascript:alert(1)" } })).toThrow(/http/i);
  });

  it("rejects unsupported profile photo data in an imported backup", () => {
    expect(() => validateCVImport({ personal: { photoData: "data:image/svg+xml,<svg/>" } })).toThrow(/photo/i);
  });
});
