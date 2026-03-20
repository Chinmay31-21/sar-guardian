import { jsPDF } from "jspdf";
import autoTableModule from "jspdf-autotable";
import type { FullSARReport } from "@/lib/csvLoader";

type ExportEngine = "trained_model_api" | "rule_engine_fallback";
type RgbColor = [number, number, number];

export interface ExportSarPdfOptions {
  engine: ExportEngine;
  engineNote?: string;
  logoPath?: string;
  logoDataUrl?: string | null;
}

export interface SarPdfBlobResult {
  blob: Blob;
  filename: string;
}

const PAGE_MARGIN_X = 40;
const PAGE_MARGIN_TOP = 36;
const PAGE_MARGIN_BOTTOM = 34;
const SECTION_SPACING_BEFORE = 18;
const SECTION_SPACING_AFTER = 14;
const SECTION_BLOCK_GAP = 16;
const SECTION_HEADING_HEIGHT = 24;

const BRAND_BLUE: RgbColor = [0, 87, 184];
const BRAND_NAVY: RgbColor = [16, 39, 77];
const TEXT_PRIMARY: RgbColor = [36, 45, 56];
const TEXT_MUTED: RgbColor = [97, 107, 122];
const BORDER_COLOR: RgbColor = [214, 223, 235];
const PANEL_FILL: RgbColor = [246, 249, 252];
const PANEL_TINT: RgbColor = [238, 245, 252];
const SURFACE_WHITE: RgbColor = [255, 255, 255];
const CRITICAL_FILL: RgbColor = [254, 226, 226];
const CRITICAL_TEXT: RgbColor = [185, 28, 28];
const HIGH_FILL: RgbColor = [255, 237, 213];
const HIGH_TEXT: RgbColor = [194, 65, 12];
const MEDIUM_FILL: RgbColor = [254, 249, 195];
const MEDIUM_TEXT: RgbColor = [161, 98, 7];
const LOW_FILL: RgbColor = [229, 231, 235];
const LOW_TEXT: RgbColor = [75, 85, 99];

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
  getImageProperties?: (imageData: string) => { width: number; height: number };
};

const autoTableExport = autoTableModule as unknown as
  | ((doc: jsPDF, options: unknown) => void)
  | { default?: (doc: jsPDF, options: unknown) => void };

function runAutoTable(doc: jsPDF, options: unknown): void {
  const autoTableFunction =
    typeof autoTableExport === "function"
      ? autoTableExport
      : autoTableExport.default;

  if (typeof autoTableFunction !== "function") {
    throw new Error("jspdf-autotable export is not callable.");
  }

  autoTableFunction(doc, options);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function sanitizeFilenameToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to convert logo image to data URL."));
    };
    reader.onerror = () => reject(new Error("Unable to read logo image."));
    reader.readAsDataURL(blob);
  });
}

export async function loadSarPdfLogoDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function getSarPdfFilename(report: FullSARReport): string {
  const fileDate = new Date().toISOString().slice(0, 10);
  const safeCaseId = sanitizeFilenameToken(report.caseId || "CASE");
  return `SAR_${safeCaseId}_${fileDate}.pdf`;
}

function getImageFormat(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  const mimeMatch = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/i)?.[1]?.toLowerCase();

  if (mimeMatch === "jpg" || mimeMatch === "jpeg") {
    return "JPEG";
  }
  if (mimeMatch === "webp") {
    return "WEBP";
  }

  return "PNG";
}

function ensureSpace(doc: jsPDF, cursorY: number, requiredHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + requiredHeight <= pageHeight - PAGE_MARGIN_BOTTOM) {
    return cursorY;
  }
  doc.addPage();
  return PAGE_MARGIN_TOP;
}

function getSeverityPalette(severity: string): { fill: RgbColor; text: RgbColor } {
  switch (severity.toLowerCase()) {
    case "critical":
      return { fill: CRITICAL_FILL, text: CRITICAL_TEXT };
    case "high":
      return { fill: HIGH_FILL, text: HIGH_TEXT };
    case "medium":
      return { fill: MEDIUM_FILL, text: MEDIUM_TEXT };
    default:
      return { fill: LOW_FILL, text: LOW_TEXT };
  }
}

function drawFallbackLogo(doc: jsPDF, x: number, y: number, width: number, height: number): void {
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(x, y, width, height, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(7, Math.min(12, height * 0.28)));
  doc.setTextColor(255, 255, 255);
  doc.text("BARCLAYS", x + width / 2, y + height / 2 + 4, { align: "center" });
}

interface DrawBrandLogoOptions {
  framed?: boolean;
  padding?: number;
  radius?: number;
  fillColor?: RgbColor;
}

function drawBrandLogo(
  doc: jsPDF,
  logoDataUrl: string | null,
  x: number,
  y: number,
  width: number,
  height: number,
  options: DrawBrandLogoOptions = {},
): boolean {
  const {
    framed = false,
    padding = 8,
    radius = 10,
    fillColor = SURFACE_WHITE,
  } = options;
  const effectivePadding = framed ? Math.min(padding, width * 0.12, height * 0.18) : 0;

  let innerX = x;
  let innerY = y;
  let innerWidth = width;
  let innerHeight = height;

  if (framed) {
    doc.setFillColor(...fillColor);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(x, y, width, height, radius, radius, "FD");
    innerX += effectivePadding;
    innerY += effectivePadding;
    innerWidth = Math.max(1, width - effectivePadding * 2);
    innerHeight = Math.max(1, height - effectivePadding * 2);
  }

  if (!logoDataUrl) {
    drawFallbackLogo(doc, innerX, innerY, innerWidth, innerHeight);
    return false;
  }

  try {
    const imageProperties = (doc as JsPdfWithAutoTable).getImageProperties?.(logoDataUrl);
    const sourceWidth = Math.max(1, imageProperties?.width ?? innerWidth);
    const sourceHeight = Math.max(1, imageProperties?.height ?? innerHeight);
    const scale = Math.min(innerWidth / sourceWidth, innerHeight / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    const drawX = innerX + (innerWidth - renderedWidth) / 2;
    const drawY = innerY + (innerHeight - renderedHeight) / 2;

    doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), drawX, drawY, renderedWidth, renderedHeight);
    return true;
  } catch {
    drawFallbackLogo(doc, innerX, innerY, innerWidth, innerHeight);
    return false;
  }
}

function sectionHeading(doc: jsPDF, title: string, cursorY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;
  const headingTop = ensureSpace(
    doc,
    cursorY + SECTION_SPACING_BEFORE,
    SECTION_HEADING_HEIGHT + SECTION_SPACING_AFTER,
  );

  doc.setFillColor(...PANEL_TINT);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(PAGE_MARGIN_X, headingTop, contentWidth, SECTION_HEADING_HEIGHT, 6, 6, "FD");
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(PAGE_MARGIN_X, headingTop, 5, SECTION_HEADING_HEIGHT, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title.toUpperCase(), PAGE_MARGIN_X + 14, headingTop + 16);

  return headingTop + SECTION_HEADING_HEIGHT + SECTION_SPACING_AFTER;
}

function addTextBlock(doc: jsPDF, text: string, cursorY: number, tinted = false): number {
  const fillColor = tinted ? PANEL_TINT : PANEL_FILL;

  runAutoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    body: [[text || "-"]],
    theme: "grid",
    tableLineColor: BORDER_COLOR,
    tableLineWidth: 0.6,
    styles: {
      fontSize: 8.8,
      cellPadding: { top: 9, right: 11, bottom: 9, left: 11 },
      textColor: TEXT_PRIMARY,
      overflow: "linebreak",
      valign: "middle",
    },
    bodyStyles: { fillColor },
  });

  return getLastTableY(doc, cursorY) + SECTION_BLOCK_GAP;
}

function addListTable(doc: jsPDF, items: string[], cursorY: number, ordered = false): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;
  const rows = (items.length > 0 ? items : ["-"]).map((item, index) => [
    ordered ? `${index + 1}.` : "•",
    item,
  ]);

  runAutoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    body: rows,
    theme: "plain",
    styles: {
      fontSize: 8.8,
      cellPadding: { top: 5, right: 0, bottom: 5, left: 0 },
      textColor: TEXT_PRIMARY,
      overflow: "linebreak",
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold", textColor: BRAND_BLUE },
      1: { cellWidth: contentWidth - 16 },
    },
  });

  return getLastTableY(doc, cursorY) + SECTION_BLOCK_GAP;
}

function addSummaryTable(doc: jsPDF, cursorY: number, rows: string[][]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;
  const labelWidth = 84;
  const valueWidth = (contentWidth - labelWidth * 2) / 2;

  runAutoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    body: rows,
    theme: "grid",
    tableLineColor: BORDER_COLOR,
    tableLineWidth: 0.6,
    styles: {
      fontSize: 8.4,
      cellPadding: { top: 7, right: 9, bottom: 7, left: 9 },
      textColor: TEXT_PRIMARY,
      overflow: "linebreak",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: PANEL_FILL },
    columnStyles: {
      0: { cellWidth: labelWidth, fillColor: PANEL_TINT, fontStyle: "bold", textColor: BRAND_NAVY },
      1: { cellWidth: valueWidth },
      2: { cellWidth: labelWidth, fillColor: PANEL_TINT, fontStyle: "bold", textColor: BRAND_NAVY },
      3: { cellWidth: valueWidth },
    },
  });

  return getLastTableY(doc, cursorY) + SECTION_BLOCK_GAP;
}

function addMetricStrip(
  doc: jsPDF,
  cursorY: number,
  metrics: Array<{ label: string; value: string }>,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;
  const gap = 8;
  const cardWidth = (contentWidth - gap * (metrics.length - 1)) / metrics.length;
  const cardHeight = 46;
  const nextY = ensureSpace(doc, cursorY, cardHeight + 6);

  metrics.forEach((metric, index) => {
    const x = PAGE_MARGIN_X + index * (cardWidth + gap);
    const valueLines = doc.splitTextToSize(metric.value, cardWidth - 16);

    doc.setFillColor(...PANEL_FILL);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(x, nextY, cardWidth, cardHeight, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(metric.label.toUpperCase(), x + 8, nextY + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.2);
    doc.setTextColor(...BRAND_NAVY);
    doc.text(valueLines, x + 8, nextY + 31);
  });

  return nextY + cardHeight + 20;
}

function getLastTableY(doc: jsPDF, fallback: number): number {
  return (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? fallback;
}

function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

function addDocumentChrome(doc: jsPDF, report: FullSARReport, logoDataUrl: string | null): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    if (page > 1) {
      doc.setFillColor(...PANEL_TINT);
      doc.rect(0, 0, pageWidth, 34, "F");
      drawBrandLogo(doc, logoDataUrl, PAGE_MARGIN_X, 6, 86, 22, {
        framed: true,
        padding: 6,
        radius: 8,
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_NAVY);
      doc.text("Suspicious Activity Report", pageWidth - PAGE_MARGIN_X, 16, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(report.caseId, pageWidth - PAGE_MARGIN_X, 25, {
        align: "right",
      });

      doc.setDrawColor(...BORDER_COLOR);
      doc.line(PAGE_MARGIN_X, 35, pageWidth - PAGE_MARGIN_X, 35);
    }

    doc.setDrawColor(230, 235, 243);
    doc.line(PAGE_MARGIN_X, pageHeight - 24, pageWidth - PAGE_MARGIN_X, pageHeight - 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Generated ${generatedAt}`, PAGE_MARGIN_X, pageHeight - 14);
    doc.text(report.caseId, pageWidth / 2, pageHeight - 14, { align: "center" });
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN_X, pageHeight - 14, {
      align: "right",
    });
  }
}

function buildSarReportPdfDocument(
  report: FullSARReport,
  options: ExportSarPdfOptions,
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;
  let cursorY = PAGE_MARGIN_TOP;

  const logoDataUrl = options.logoDataUrl ?? null;

  const headerTop = 24;
  const headerHeight = 108;
  const riskPalette = getSeverityPalette(report.riskCategory.toLowerCase());
  const riskBadgeText = `${report.riskCategory.toUpperCase()} RISK`;
  const riskBadgeWidth = Math.max(72, doc.getTextWidth(riskBadgeText) + 18);

  doc.setFillColor(...PANEL_FILL);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(PAGE_MARGIN_X, headerTop, contentWidth, headerHeight, 12, 12, "FD");
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(PAGE_MARGIN_X, headerTop, contentWidth, 16, 12, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(255, 255, 255);
  doc.text("CONFIDENTIAL · AML COMPLIANCE WORKFLOW", PAGE_MARGIN_X + 12, headerTop + 10);

  doc.setFillColor(...riskPalette.fill);
  doc.roundedRect(
    pageWidth - PAGE_MARGIN_X - riskBadgeWidth - 14,
    headerTop + 24,
    riskBadgeWidth,
    18,
    9,
    9,
    "F",
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...riskPalette.text);
  doc.text(riskBadgeText, pageWidth - PAGE_MARGIN_X - riskBadgeWidth / 2 - 14, headerTop + 36, {
    align: "center",
  });

  drawBrandLogo(doc, logoDataUrl, PAGE_MARGIN_X + 18, headerTop + 28, 184, 54, {
    framed: true,
    padding: 8,
    radius: 12,
    fillColor: SURFACE_WHITE,
  });

  doc.setDrawColor(...BORDER_COLOR);
  doc.line(PAGE_MARGIN_X + 220, headerTop + 26, PAGE_MARGIN_X + 220, headerTop + headerHeight - 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Suspicious Activity Report", pageWidth - PAGE_MARGIN_X - 14, headerTop + 58, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Financial Intelligence Unit Compliance Filing", pageWidth - PAGE_MARGIN_X - 14, headerTop + 76, {
    align: "right",
  });
  doc.text(report.reportingUnit, pageWidth - PAGE_MARGIN_X - 14, headerTop + 91, {
    align: "right",
  });

  cursorY = addMetricStrip(doc, headerTop + headerHeight + 18, [
    { label: "Case ID", value: report.caseId },
    { label: "Date Generated", value: report.dateGenerated },
    { label: "AI Confidence", value: `${report.aiConfidence}%` },
    { label: "Regulatory Impact", value: `${report.regulatoryImpactScore}%` },
  ]);

  cursorY = sectionHeading(doc, "Case Metadata", cursorY);
  cursorY = addSummaryTable(doc, cursorY, [
      ["Case ID", report.caseId, "Date Generated", report.dateGenerated],
      ["Reporting Unit", report.reportingUnit, "Primary Country", report.primaryCountry],
      ["AI Confidence", `${report.aiConfidence}%`, "Regulatory Impact", `${report.regulatoryImpactScore}%`],
      ["Model", report.modelVersion, "Engine", options.engine === "trained_model_api" ? "Trained Model API" : "Rules Fallback"],
  ]);

  if (options.engineNote) {
    cursorY = sectionHeading(doc, "Generation Note", cursorY);
    cursorY = addTextBlock(doc, options.engineNote, cursorY, true);
  }

  cursorY = sectionHeading(doc, "Subject Profile", cursorY);
  cursorY = addSummaryTable(doc, cursorY, [
      ["Entity / Account", report.entityId, "Risk Category", `${report.riskCategory} (${report.riskScore}/100)`],
      ["KYC Status", report.kycStatus, "Risk Types", report.riskTypes.join(", ") || "N/A"],
      ["Connections", String(report.networkConnections), "Relationship Types", report.relationshipTypes.join(", ") || "N/A"],
      ["Institution", report.reportingInstitution, "Countries Involved", report.countriesInvolved.join(", ") || "N/A"],
  ]);

  cursorY = sectionHeading(doc, "Transaction Summary", cursorY);
  cursorY = addSummaryTable(doc, cursorY, [
      ["Review Period", `${report.periodStart} to ${report.periodEnd}`, "Total Amount", formatCurrency(report.totalAmount)],
      ["Txn Count", `${report.txnCount} total`, "Suspicious Txns", String(report.suspiciousTxnCount)],
      ["Average Amount", formatCurrency(report.avgAmount), "Max Single Txn", formatCurrency(report.maxSingleAmount)],
      ["Countries", report.countriesInvolved.join(", ") || "N/A", "Patterns", report.patternsObserved.join(", ") || "N/A"],
  ]);

  cursorY = sectionHeading(doc, "Suspicious Transaction Detail", cursorY);
  runAutoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    head: [["Date", "Amount", "Type", "From", "To", "Indicator"]],
    body: report.transactionRows.length
      ? report.transactionRows.map((row) => [
          row.date,
          formatCurrency(row.amount),
          row.type,
          row.from,
          row.to,
          row.indicator,
        ])
      : [["-", "-", "-", "-", "-", "No suspicious transaction rows available"]],
    theme: "grid",
    tableLineColor: BORDER_COLOR,
    tableLineWidth: 0.6,
    styles: { fontSize: 7.4, cellPadding: { top: 4, right: 5, bottom: 4, left: 5 }, overflow: "linebreak", textColor: TEXT_PRIMARY },
    headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: PANEL_FILL },
    columnStyles: {
      0: { cellWidth: 54, halign: "center" },
      1: { cellWidth: 68, halign: "right" },
      2: { cellWidth: 78 },
      3: { cellWidth: 98 },
      4: { cellWidth: 98 },
      5: { cellWidth: contentWidth - 396 },
    },
  });
  cursorY = getLastTableY(doc, cursorY) + SECTION_BLOCK_GAP;

  cursorY = sectionHeading(doc, "Regulatory Mapping", cursorY);
  runAutoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    head: [["Severity", "Rule", "Reference", "Confidence", "Trigger"]],
    body: report.regulatoryBreaches.length
      ? report.regulatoryBreaches.map((breach) => [
          breach.severity.toUpperCase(),
          breach.rule,
          breach.ref,
          `${breach.confidence}%`,
          breach.trigger,
        ])
      : [["-", "No regulatory breaches available", "-", "-", "-"]],
    theme: "grid",
    tableLineColor: BORDER_COLOR,
    tableLineWidth: 0.6,
    styles: { fontSize: 7.3, cellPadding: { top: 4, right: 5, bottom: 4, left: 5 }, overflow: "linebreak", textColor: TEXT_PRIMARY },
    headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: PANEL_FILL },
    columnStyles: {
      0: { cellWidth: 56, halign: "center" },
      1: { cellWidth: 132 },
      2: { cellWidth: 92 },
      3: { cellWidth: 56, halign: "center" },
      4: { cellWidth: contentWidth - 336 },
    },
    didParseCell: (hookData: { section: string; column: { index: number }; row: { raw: string[] }; cell: { styles: Record<string, unknown> } }) => {
      if (hookData.section !== "body" || hookData.column.index !== 0) {
        return;
      }

      const palette = getSeverityPalette(hookData.row.raw[0] ?? "low");
      hookData.cell.styles.fillColor = palette.fill;
      hookData.cell.styles.textColor = palette.text;
      hookData.cell.styles.fontStyle = "bold";
    },
  });
  cursorY = getLastTableY(doc, cursorY) + SECTION_BLOCK_GAP;

  cursorY = sectionHeading(doc, "Risk Indicators", cursorY);
  cursorY = addListTable(doc, report.riskIndicators, cursorY, true);

  cursorY = sectionHeading(doc, "Evidence Summary", cursorY);
  cursorY = addListTable(doc, report.evidenceItems, cursorY);

  if (report.historicalPrecedent) {
    cursorY = sectionHeading(doc, "Historical Precedent", cursorY);
    cursorY = addTextBlock(doc, report.historicalPrecedent, cursorY, true);
  }

  cursorY = sectionHeading(doc, "Suspicious Activity Description", cursorY);
  cursorY = addTextBlock(doc, report.activityDescription, cursorY);

  cursorY = sectionHeading(doc, "Conclusion", cursorY);
  cursorY = addTextBlock(doc, report.conclusion, cursorY, true);

  cursorY = ensureSpace(doc, cursorY + 10, 78);
  doc.setFillColor(...PANEL_TINT);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(PAGE_MARGIN_X, cursorY, pageWidth - PAGE_MARGIN_X * 2, 68, 4, 4, "FD");
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(PAGE_MARGIN_X, cursorY, 5, 68, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Compliance Notice", PAGE_MARGIN_X + 14, cursorY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_PRIMARY);
  doc.text(
    [
      "This report is generated for AML compliance workflow and must be reviewed by an authorized compliance officer before filing.",
      "Retention policy: preserve supporting evidence and narrative records for at least 5 years.",
      "Disclosure restriction: do not inform subject entities about SAR filing decisions (tipping-off prohibition).",
    ],
    PAGE_MARGIN_X + 14,
    cursorY + 30
  );

  addDocumentChrome(doc, report, logoDataUrl);

  return {
    doc,
    filename: getSarPdfFilename(report),
  };
}

export function createSarReportPdfBlob(
  report: FullSARReport,
  options: ExportSarPdfOptions,
): SarPdfBlobResult {
  const { doc, filename } = buildSarReportPdfDocument(report, options);

  return {
    blob: doc.output("blob"),
    filename,
  };
}

export function exportSarReportPdf(
  report: FullSARReport,
  options: ExportSarPdfOptions,
): void {
  const { blob, filename } = createSarReportPdfBlob(report, options);
  downloadBlob(blob, filename);
}
