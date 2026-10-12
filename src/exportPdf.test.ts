// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { downloadCVPdf } from "./exportPdf";
import { createBlankCV, templateOptions } from "./types";

afterEach(() => vi.restoreAllMocks());

describe("CV PDF export", () => {
  it("exports all four templates as readable one-page PDFs", () => {
    const pageCounts: number[] = [];
    vi.spyOn(jsPDF.prototype, "save").mockImplementation(function (this: jsPDF) {
      pageCounts.push(this.getNumberOfPages());
      return this;
    });

    templateOptions.forEach(({ id }) => {
      const cv = createBlankCV("A test CV");
      cv.template = id;
      cv.personal.fullName = "Jordan Taylor";
      cv.personal.summary = "A careful, clear summary for the representative template export.";
      downloadCVPdf(cv);
    });

    expect(pageCounts).toEqual([1, 1, 1, 1]);
  });

  it("flows long experience entries across pages without adding a blank page", () => {
    const pageCounts: number[] = [];
    vi.spyOn(jsPDF.prototype, "save").mockImplementation(function (this: jsPDF) {
      pageCounts.push(this.getNumberOfPages());
      return this;
    });
    const cv = createBlankCV("Long CV");
    cv.personal.fullName = "Jordan Taylor";
    cv.experience = Array.from({ length: 8 }, (_, index) => ({
      id: `experience-${index}`,
      employer: `Organization ${index + 1}`,
      position: "Project Lead",
      startDate: "Jan 2021",
      endDate: "Dec 2023",
      description: "A detailed outcome, contribution, and responsibility. ".repeat(35),
    }));

    downloadCVPdf(cv);

    expect(pageCounts).toHaveLength(1);
    expect(pageCounts[0]).toBeGreaterThan(1);
  });
});
