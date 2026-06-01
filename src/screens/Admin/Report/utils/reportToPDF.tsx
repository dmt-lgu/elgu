import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { regionKeyToCode, regionMapping } from "./mockData";
import Swal from "sweetalert2";
import { format } from "date-fns";

// --- TYPE DEFINITIONS ---

type RowData = {
  regionKey: string;
  lgu: any;
  month?: string;
  monthData?: any;
  yearLabel?: string;
};

interface ExportTableReportToPDFParams {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  logoUrl: string;
  fileLabel?: string;
  moduleLabel?: string;
  selectedDateType?: string;
  captureElement?: HTMLElement | null;
  captureSelector?: string;
}

// --- HELPERS ---

const formatMonthYear = (monthStr: string): string => {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length < 2) return monthStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (isNaN(year) || isNaN(month)) return monthStr;
  const date = new Date(year, month, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

const getMonthRangeLabel = (months?: string[]): string => {
  if (!months || months.length === 0) return "";
  if (months.length === 1) return `(${formatMonthYear(months[0])})`;
  return `(${formatMonthYear(months[0])} - ${formatMonthYear(
    months[months.length - 1]
  )})`;
};

const toFileSlug = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildPdfFileName = (moduleLabel: string, dateRangeLabel: string, fallback: string): string => {
  const moduleSlug = toFileSlug(moduleLabel).replace(/-report$/, "") || toFileSlug(fallback) || "report";
  const rangeSlug = toFileSlug(dateRangeLabel);
  return `${moduleSlug}-report${rangeSlug ? `-${rangeSlug}` : ""}.pdf`;
};

const makeTd = (val: any, opts: any = {}): HTMLTableCellElement => {
    const td = document.createElement("td");
    td.innerHTML = val != null && val !== "" ? String(val) : "0";
    td.style.border = "#e5e5e5 0.5px solid";
    td.style.padding = "5px";
    td.style.textAlign = opts.align || "center";
    td.style.fontFamily = "'Rubik', sans-serif";
    td.style.verticalAlign = "middle";
    td.style.fontSize = opts.fontSize || "11px";
    if (opts.bold) td.style.fontWeight = "bold";
    if (opts.color) td.style.color = opts.color;
    if (opts.bg) td.style.background = opts.bg;
    if (opts.striped) td.style.background = "#f4f4f5";
    if (opts.colSpan) td.colSpan = opts.colSpan;
    return td;
};

const NEW_LICENSE_KEYS = ['newLicenseIssued', 'newIssued', 'licenseIssuedNew', 'newLicense'];
const RENEW_LICENSE_KEYS = ['renewLicenseIssued', 'renewIssued', 'licenseIssuedRenewal', 'renewLicense'];
const BUILDING_LICENSE_KEYS = ['buildingLicenseIssued', 'buildingIssued', 'licenseIssued', 'issued'];
const CO_LICENSE_KEYS = ['coLicenseIssued', 'coIssued', 'licenseIssued', 'issued'];

const getLicenseIssued = (item: any, keys: string[], fallback: number): number => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return fallback;
};

const getCitizensServed = (lgu: any): number => Number(lgu?.totalCitizensServed || 0);

// Try to fetch an image and convert to a data URL to avoid cross-origin tainting
const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onloadend = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
};

// Ensure images inside an element are either same-origin/CORS or inlined as data URLs.
const inlineImagesInElement = async (root: HTMLElement) => {
  const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(imgs.map(async (img) => {
    if (!img.src) return;
    if (img.src.startsWith('data:')) return;
    try {
      // try to set crossorigin first to allow html2canvas to fetch via CORS
      img.crossOrigin = 'anonymous';
      // wait a moment if image is still loading
      if (!img.complete) await new Promise((res) => { img.onload = () => res(null); img.onerror = () => res(null); });
      // if the image failed to load (naturalWidth === 0) attempt to fetch and inline
      if (img.naturalWidth === 0) {
        const dataUrl = await fetchImageAsDataUrl(img.src);
        if (dataUrl) img.src = dataUrl;
      }
    } catch (err) {
      const dataUrl = await fetchImageAsDataUrl(img.src);
      if (dataUrl) img.src = dataUrl;
    }
  }));
};

const createPdfHeader = (
    logoUrl: string,
    moduleLabel: string,
    dateRangeLabel: string,
    generatedAt: Date
): HTMLDivElement => {
    const headerContainer = document.createElement("div");
    headerContainer.style.display = "flex";
    headerContainer.style.justifyContent = "space-between";
    headerContainer.style.alignItems = "center";
    headerContainer.style.marginBottom = "20px";
    headerContainer.style.paddingBottom = "20px";
    headerContainer.style.borderBottom = "1px solid #e2e8f0";
    const leftSide = document.createElement("div");
    leftSide.style.display = "flex";
    leftSide.style.alignItems = "center";
    leftSide.style.gap = "16px";
    const logoImg = document.createElement("img");
    logoImg.src = logoUrl;
    logoImg.style.width = "300px";
    logoImg.style.height = "auto";
    leftSide.appendChild(logoImg);
    const titleContainer = document.createElement("div");
    titleContainer.style.borderLeft = "1px solid #cbd5e1";
    titleContainer.style.paddingLeft = "16px";
    const title = document.createElement("h1");
    title.textContent = moduleLabel || "Report";
    title.style.fontSize = "20px";
    title.style.fontWeight = "800";
    title.style.color = "#1e293b";
    title.style.letterSpacing = "-0.025em";
    title.style.margin = "0";
    title.style.fontFamily = "'Rubik', sans-serif";
    titleContainer.appendChild(title);
    const subtitle = document.createElement("p");
    subtitle.style.fontSize = "12px";
    subtitle.style.fontWeight = "500";
    subtitle.style.color = "#64748b";
    subtitle.style.marginTop = "4px";
    subtitle.style.marginBlock = "0";
    subtitle.style.fontFamily = "'Rubik', sans-serif";
    const dateRangeSpan = document.createElement("span");
    dateRangeSpan.textContent = dateRangeLabel;
    dateRangeSpan.style.fontWeight = "600";
    dateRangeSpan.style.color = "#475569";
    subtitle.append("Generated for the period: ", dateRangeSpan);
    titleContainer.appendChild(subtitle);
    leftSide.appendChild(titleContainer);
    headerContainer.appendChild(leftSide);
    const rightSide = document.createElement("div");
    rightSide.style.textAlign = "right";
    const generatedOnText = document.createElement("p");
    generatedOnText.textContent = "Generated On";
    generatedOnText.style.fontSize = "11px";
    generatedOnText.style.fontWeight = "600";
    generatedOnText.style.color = "#475569";
    generatedOnText.style.margin = "0";
    generatedOnText.style.fontFamily = "'Rubik', sans-serif";
    rightSide.appendChild(generatedOnText);
    const generatedDate = document.createElement("p");
    generatedDate.textContent = format(generatedAt, "MMM dd, yyyy, h:mm a");
    generatedDate.style.fontSize = "12px";
    generatedDate.style.fontFamily = "monospace";
    generatedDate.style.color = "#64748b";
    generatedDate.style.margin = "0";
    generatedDate.style.marginTop = "2px";
    rightSide.appendChild(generatedDate);
    headerContainer.appendChild(rightSide);
    return headerContainer;
};

const createReportTableHeader = (
    _moduleLabel: any,
    isCO: boolean,
    isBldg: boolean,
    isBC: boolean
): HTMLTableSectionElement => {
    const thead = document.createElement("thead");

    const applyCommonStyles = (th: HTMLTableCellElement) => {
        th.style.color = "black";
        th.style.padding = "8px";
        th.style.textAlign = "center";
        th.style.verticalAlign = "middle";
        th.style.borderRight = "1px solid #cbd5e1";
        th.style.borderBottom = "1px solid #cbd5e1";
    };

  if (isBC || isCO || isBldg) {
    const headerRow = document.createElement("tr");
    if (isBC) {
      const labels = ["Region", "LGU", "Citizens Served", "Total Results"];
      const widths = ["18%", "38%", "22%", "22%"];
      labels.forEach((label, idx) => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.width = widths[idx];
        th.style.background = "#9ec6f7";
        th.style.fontWeight = "bold";
        th.style.fontSize = "14px";
        applyCommonStyles(th);
        headerRow.appendChild(th);
      });
    } else {
      // For Certificate of Occupancy and Building Permit, include License Issued and eGOV columns
      const labels = ["Region", "LGU", "Citizens Served", "License Issued", "PAID", "PAID (eGOVPay)", "ONGOING", "Total"];
      const widths = ["10%", "26%", "10%", "10%", "10%", "10%", "12%", "12%"];
      labels.forEach((label, idx) => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.width = widths[idx] || "auto";
        th.style.background = "#9ec6f7";
        th.style.fontWeight = "bold";
        th.style.fontSize = "14px";
        applyCommonStyles(th);
        headerRow.appendChild(th);
      });
    }
    thead.appendChild(headerRow);
  } else {
        const headerRow1 = document.createElement("tr");
    const mainHeaders = [
      { label: "Region", rowSpan: 2 },
      { label: "LGU", rowSpan: 2 },
      { label: "Citizens Served", rowSpan: 2 },
      // Note: include License Issued as an explicit computed column for New and Renewal (colSpan 5)
      { label: "New", colSpan: 5 },
      { label: "Renewal", colSpan: 5 },
      { label: "Male", colSpan: 3 },
      { label: "Female", colSpan: 3 },
    ];

        mainHeaders.forEach(header => {
            const th = document.createElement("th");
            th.textContent = header.label;
            th.style.background = "#9ec6f7";
            th.style.fontWeight = "bold";
            th.style.textTransform = "uppercase";
            th.style.letterSpacing = "0.05em";
            th.style.fontSize = "14px";
            th.style.padding = "8px";
            th.style.textAlign = "center";
            applyCommonStyles(th);

            if (header.rowSpan) th.rowSpan = header.rowSpan;
            if (header.colSpan) th.colSpan = header.colSpan;
            headerRow1.appendChild(th);
        });
        thead.appendChild(headerRow1);

        const headerRow2 = document.createElement("tr");
    const subHeaders = [
      // New group: License Issued, PAID (For Issuance), PAID (eGOVPay), ONGOING, Total
      { label: "License Issued", isTotal: false },
      { label: "PAID <br /> <span style='font-weight: 500;'>(For Issuance and License Issued)</span>", isTotal: false },
      { label: "PAID <br /> <span style='font-weight:500;'>(eGOVPay)</span>", isTotal: false },
      { label: "ONGOING", isTotal: false },
      { label: "Total", isTotal: true },
      // Renewal group: same ordering
      { label: "License Issued", isTotal: false },
      { label: "PAID <br /> <span style='font-weight: 500;'>(For Issuance and License Issued)</span>", isTotal: false },
      { label: "PAID <br /> <span style='font-weight:500;'>(eGOVPay)</span>", isTotal: false },
      { label: "ONGOING", isTotal: false },
      { label: "Total", isTotal: true },
      // Male and Female groups unchanged
      { label: "PAID <br /> <span style='font-weight: 500;'>(For Issuance and License Issued)</span>", isTotal: false },
      { label: "ONGOING", isTotal: false },
      { label: "Total", isTotal: true },
      { label: "PAID <br /> <span style='font-weight: 500;'>(For Issuance and License Issued)</span>", isTotal: false },
      { label: "ONGOING", isTotal: false },
      { label: "Total", isTotal: true },
    ];

        subHeaders.forEach(header => {
            const th = document.createElement("th");
            th.innerHTML = header.label;
            th.style.fontSize = "11px"; 
            applyCommonStyles(th);

            if (header.isTotal) {
                th.style.background = "#bfdbfe";
                th.style.fontWeight = "bold";
                th.style.textTransform = "uppercase";
            } else {
                th.style.background = "#dbeafe";
                th.style.fontWeight = "600";
            }
            headerRow2.appendChild(th);
        });
        thead.appendChild(headerRow2);
    }
    return thead;
};

const createReportGrandTotalRow = (
  filteredResults: any[], isBC: boolean, isCO: boolean, isBldg: boolean,
  isDayMode: boolean, dateRangeLabel: string, isLastPage: boolean
): HTMLTableRowElement => {
  const totalTr = document.createElement("tr");
  totalTr.style.background = "#3a4554";
  totalTr.style.color = "white";
  totalTr.style.fontWeight = "bold";

  const grandTotalCell = makeTd("", { bold: true, align: "left", bg: "#3a4554", color: "#fff", fontSize: "14px" });
  grandTotalCell.colSpan = 2;
  grandTotalCell.innerHTML = `GRAND TOTAL <br/><span style="font-size:10px; font-weight:normal;">(${dateRangeLabel})</span>`;
  totalTr.appendChild(grandTotalCell);

  const commonProps = { bold: true, bg: "#3a4554", color: "#fff", fontSize: "14px" };

  if (isBC) {
      const citizensServed = filteredResults.reduce((sum, lgu) => sum + getCitizensServed(lgu), 0);
      const total = filteredResults.reduce((sum, lgu) => {
      if (isDayMode) {
        const monthlySum = (lgu.monthlyResults || []).reduce((mSum: number, month: any) => mSum + (month.totalCount || 0), 0);
        return sum + monthlySum;
      }
      return sum + (lgu.totalCount || 0);
    }, 0);
    totalTr.appendChild(makeTd(citizensServed, commonProps));
    totalTr.appendChild(makeTd(total, commonProps));
  } else if (isCO || isBldg) {
  const pendingKey = isCO ? "coPending" : "buildingPending";
  const paidKey = isCO ? "coPaid" : "buildingPaid";
  const geoKey = isCO ? "coPaidViaEgov" : "buildingPaidViaEgov";
  const totals = filteredResults.reduce((acc, lgu) => {
    if (isDayMode) {
      (lgu.monthlyResults || []).forEach((month: any) => {
        acc.paid += Number(month[paidKey] || 0);
        acc.geo += Number(month[geoKey] || 0);
        acc.pending += Number(month[pendingKey] || 0);
      });
    } else {
      acc.paid += Number(lgu.sum?.[paidKey] || 0);
      acc.geo += Number(lgu.sum?.[geoKey] || 0);
      acc.pending += Number(lgu.sum?.[pendingKey] || 0);
    }
    return acc;
  }, { paid: 0, geo: 0, pending: 0 });

  const licenseKeys = isCO ? CO_LICENSE_KEYS : BUILDING_LICENSE_KEYS;
  const licenseTotal = filteredResults.reduce((sum, lgu) => {
    const dataToSum = isDayMode ? (lgu.monthlyResults || []) : (lgu.sum ? [lgu.sum] : [lgu]);
    return sum + dataToSum.reduce((innerSum: number, s: any) => innerSum + getLicenseIssued(s, licenseKeys, Number(s[paidKey] || 0)), 0);
  }, 0);
  const overallTotal = (totals.paid || 0) + (totals.geo || 0) + (totals.pending || 0);

  const citizensServed = filteredResults.reduce((sum, lgu) => sum + getCitizensServed(lgu), 0);
  totalTr.appendChild(makeTd(citizensServed, commonProps));
  totalTr.appendChild(makeTd(licenseTotal, commonProps));
  totalTr.appendChild(makeTd(totals.paid, commonProps));
  totalTr.appendChild(makeTd(totals.geo, commonProps));
  totalTr.appendChild(makeTd(totals.pending, commonProps));
  totalTr.appendChild(makeTd(overallTotal, commonProps));
    } else {
      // Sum the base totals first so grand "License Issued" matches the rendered rows.
      const totals = filteredResults.reduce((acc, lgu) => {
        // Use monthly entries if day mode. Otherwise prefer lgu.sum but fall back
        // to top-level lgu object (some datasets store aggregated sums on the root LGU).
        const dataToSum = isDayMode ? (lgu.monthlyResults || []) : (lgu.sum ? [lgu.sum] : [lgu]);
        dataToSum.forEach((s: any) => {
          // Defensive access for possible key variations; prefer explicit fields used when rendering rows
          const nPaid = Number(s.newPaid || s.new_paid || 0);
          const nGeo = Number(s.newPaidViaEgov || s.newPaidViaEGov || 0);
          const nPending = Number(s.newPending || s.new_pending || 0);

          const rPaid = Number(s.renewPaid || s.renew_paid || 0);
          const rGeo = Number(s.renewPaidViaEgov || s.renewPaidViaEGov || 0);
          const rPending = Number(s.renewPending || s.renew_pending || 0);

          acc.newPaid += nPaid;
          acc.newGeo += nGeo;
          acc.newPending += nPending;

          acc.renewalPaid += rPaid;
          acc.renewalGeo += rGeo;
          acc.renewalPending += rPending;

          acc.malePaid += Number(s.malePaid || s.male_paid || 0);
          acc.malePending += Number(s.malePending || s.male_pending || 0);
          acc.femalePaid += Number(s.femalePaid || s.female_paid || 0);
          acc.femalePending += Number(s.femalePending || s.female_pending || 0);
        });
        return acc;
      }, {
        newPaid: 0, newGeo: 0, newPending: 0,
        renewalPaid: 0, renewalGeo: 0, renewalPending: 0,
        malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0,
      });
      const citizensServed = filteredResults.reduce((sum, lgu) => sum + getCitizensServed(lgu), 0);

      // Now, calculate the derived totals from the aggregated sums
      const newLicenseTotal = filteredResults.reduce((sum, lgu) => {
        const dataToSum = isDayMode ? (lgu.monthlyResults || []) : (lgu.sum ? [lgu.sum] : [lgu]);
        return sum + dataToSum.reduce((innerSum: number, s: any) => innerSum + getLicenseIssued(s, NEW_LICENSE_KEYS, Number(s.newPaid || s.new_paid || 0)), 0);
      }, 0);
      const newOverallTotal = totals.newPaid + totals.newGeo + totals.newPending;
      const renewalLicenseTotal = filteredResults.reduce((sum, lgu) => {
        const dataToSum = isDayMode ? (lgu.monthlyResults || []) : (lgu.sum ? [lgu.sum] : [lgu]);
        return sum + dataToSum.reduce((innerSum: number, s: any) => innerSum + getLicenseIssued(s, RENEW_LICENSE_KEYS, Number(s.renewPaid || s.renew_paid || 0)), 0);
      }, 0);
      const renewalOverallTotal = totals.renewalPaid + totals.renewalGeo + totals.renewalPending;
      const maleTotal = totals.malePaid + totals.malePending;
      const femaleTotal = totals.femalePaid + totals.femalePending;

      // New group: License Issued, Paid, eGOV, Pending, Total
      totalTr.appendChild(makeTd(citizensServed, commonProps));
      totalTr.appendChild(makeTd(newLicenseTotal, commonProps));
      totalTr.appendChild(makeTd(totals.newPaid, commonProps));
      totalTr.appendChild(makeTd(totals.newGeo, commonProps));
      totalTr.appendChild(makeTd(totals.newPending, commonProps));
      totalTr.appendChild(makeTd(newOverallTotal, commonProps));

      // Renewal group: License Issued, Paid, eGOV, Pending, Total
      totalTr.appendChild(makeTd(renewalLicenseTotal, commonProps));
      totalTr.appendChild(makeTd(totals.renewalPaid, commonProps));
      totalTr.appendChild(makeTd(totals.renewalGeo, commonProps));
      totalTr.appendChild(makeTd(totals.renewalPending, commonProps));
      totalTr.appendChild(makeTd(renewalOverallTotal, commonProps));

      // Male and Female groups
      totalTr.appendChild(makeTd(totals.malePaid, commonProps));
      totalTr.appendChild(makeTd(totals.malePending, commonProps));
      totalTr.appendChild(makeTd(maleTotal, commonProps));
      totalTr.appendChild(makeTd(totals.femalePaid, commonProps));
      totalTr.appendChild(makeTd(totals.femalePending, commonProps));
      totalTr.appendChild(makeTd(femaleTotal, commonProps));
  }
  if (!isLastPage) totalTr.style.visibility = "hidden";
  return totalTr;
};

const createPageContent = (
  rows: RowData[], isLastPage: boolean, params: ExportTableReportToPDFParams, generatedAt: Date,
  isSimpleReport: boolean, isBC: boolean, isCO: boolean, isBldg: boolean,
  isDayMode: boolean, isLandscape: boolean
): HTMLDivElement => {
  const { logoUrl, moduleLabel = "Report", dateRangeLabel, filteredResults } = params;
  const wrapperDiv = document.createElement("div");
  const isBP = moduleLabel === "Business Permit";
  const isWP = moduleLabel === "Working Permit";
  const isWideModule = isBP || isWP;

  const desiredWidthPx = isLandscape 
    ? (isWideModule ? 1900 : 1400) 
    : (isSimpleReport ? 1100 : 1000);

  wrapperDiv.style.cssText = `display: inline-block; background: #fff; font-family: 'Rubik', sans-serif; padding: 20px; width: ${desiredWidthPx}px;`;

  const header = createPdfHeader(logoUrl, moduleLabel, dateRangeLabel, generatedAt);
  wrapperDiv.appendChild(header);

  const tableChunk = document.createElement("table");
  tableChunk.setAttribute("style", `width: 100%; font-size: 16px; font-family: Rubik, sans-serif; border-collapse: collapse; table-layout: fixed;`);
  
  const thead = createReportTableHeader(moduleLabel, isCO, isBldg, isBC);
  const tbodyChunk = document.createElement("tbody");

  if (isSimpleReport && !isLastPage) {
    wrapperDiv.style.height = isLandscape ? '720px' : '1050px';
    wrapperDiv.style.display = 'flex';
    wrapperDiv.style.flexDirection = 'column';
    tableChunk.style.flexGrow = '1';
  }

  tableChunk.appendChild(thead);
  tableChunk.appendChild(tbodyChunk);
  
  let prevRegionKey: string | null = null;
  const regionCountsOnPage: Record<string, number> = {};
  rows.forEach((r) => { regionCountsOnPage[r.regionKey] = (regionCountsOnPage[r.regionKey] || 0) + 1; });

  rows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    const isStriped = idx % 2 === 0;
    if (row.regionKey !== prevRegionKey) {
      const regionText = regionKeyToCode[row.regionKey] || row.regionKey || "N/A";
      const td = makeTd(regionText, { bold: true, fontSize: "14px" });
      td.style.padding = "8px 6px";
      td.rowSpan = regionCountsOnPage[row.regionKey];
      tr.appendChild(td);
      prevRegionKey = row.regionKey;
    }
    const lguParts = (row.lgu?.lgu || "").split(",");
    const lguName = lguParts[0] ? lguParts[0].trim() : "";
    const provinceName = row.lgu?.province || (lguParts[1] ? lguParts[1].trim() : "");
    
    const lguNameSize = "12px";
    const provinceNameSize = "11px";
    const dateSize = "10px";

    const lguHtml = `<span style="font-weight:bold; font-size:${lguNameSize};">${lguName}</span>
      ${provinceName ? `<span style="font-weight:500; font-size:${provinceNameSize};">, ${provinceName}</span>` : ""}
      <br/><span style="font-size:${dateSize}; font-weight:bold; color:#1d4ed8;">
        ${isDayMode ? `(${formatMonthYear(row.month || "")})` : getMonthRangeLabel(row.lgu?.months)}
      </span>`;
    tr.appendChild(makeTd(lguHtml, { align: "left", striped: isStriped }));
    tr.appendChild(makeTd(getCitizensServed(row.lgu), { striped: isStriped, fontSize: "14px", bold: true }));

    if (isBC) {
      const data = isDayMode ? row.monthData : row.lgu;
      tr.appendChild(makeTd((data?.totalCount ?? 0), { striped: isStriped, fontSize: "14px", bold: true }));
    } else if (isCO || isBldg) {
      const src = isDayMode ? row.monthData : (row.lgu?.sum ?? row.lgu ?? {});
      const pendingKey = isCO ? "coPending" : "buildingPending";
      const paidKey = isCO ? "coPaid" : "buildingPaid";
      const geoKey = isCO ? "coPaidViaEgov" : "buildingPaidViaEgov";

      const paid = Number(src?.[paidKey] ?? 0);
      const geo = Number(src?.[geoKey] ?? 0);
      const pending = Number(src?.[pendingKey] ?? 0);
      const license = getLicenseIssued(src, isCO ? CO_LICENSE_KEYS : BUILDING_LICENSE_KEYS, paid);
      const total = paid + geo + pending;

      tr.appendChild(makeTd(license, { striped: isStriped, fontSize: "14px", bold: true, color: '#0f172a' }));
      tr.appendChild(makeTd(paid, { striped: isStriped, fontSize: "14px", bold: true, color: '#166534' }));
      tr.appendChild(makeTd(geo, { striped: isStriped, fontSize: "14px", bold: true, color: '#0ea5a4' }));
      tr.appendChild(makeTd(pending, { striped: isStriped, fontSize: "14px", bold: true, color: '#1d4ed8' }));
      tr.appendChild(makeTd(total, { striped: isStriped, fontSize: "14px", bold: true, color: '#0b1220' }));
    } else {
      const data = isDayMode ? row.monthData : (row.lgu?.sum || {});
        const cellOpts = { striped: isStriped, fontSize: "14px", bold: true };

        const newPaid = data?.newPaid ?? 0;
        const newGeo = data?.newPaidViaEgov ?? 0;
        const newPending = data?.newPending ?? 0;
        const newLicenseIssued = getLicenseIssued(data, NEW_LICENSE_KEYS, Number(newPaid || 0));
        const newTotal = Number(newPaid || 0) + Number(newGeo || 0) + Number(newPending || 0);
        tr.appendChild(makeTd(newLicenseIssued, cellOpts));
        tr.appendChild(makeTd(newPaid, cellOpts));
        tr.appendChild(makeTd(newGeo, cellOpts));
        tr.appendChild(makeTd(newPending, cellOpts));
        tr.appendChild(makeTd(newTotal, cellOpts));

        const renewPaid = data?.renewPaid ?? 0;
        const renewGeo = data?.renewPaidViaEgov ?? 0;
        const renewPending = data?.renewPending ?? 0;
        const renewLicenseIssued = getLicenseIssued(data, RENEW_LICENSE_KEYS, Number(renewPaid || 0));
        const renewTotal = Number(renewPaid || 0) + Number(renewGeo || 0) + Number(renewPending || 0);
        tr.appendChild(makeTd(renewLicenseIssued, cellOpts));
        tr.appendChild(makeTd(renewPaid, cellOpts));
        tr.appendChild(makeTd(renewGeo, cellOpts));
        tr.appendChild(makeTd(renewPending, cellOpts));
        tr.appendChild(makeTd(renewTotal, cellOpts));

        // Male / Female groups remain the same
        tr.appendChild(makeTd(data?.malePaid ?? 0, cellOpts));
        tr.appendChild(makeTd(data?.malePending ?? 0, cellOpts));
        tr.appendChild(makeTd((data?.malePaid ?? 0) + (data?.malePending ?? 0), cellOpts));
        tr.appendChild(makeTd(data?.femalePaid ?? 0, cellOpts));
        tr.appendChild(makeTd(data?.femalePending ?? 0, cellOpts));
        tr.appendChild(makeTd((data?.femalePaid ?? 0) + (data?.femalePending ?? 0), cellOpts));
    }
    tbodyChunk.appendChild(tr);
  });

  const totalTr = createReportGrandTotalRow(filteredResults, isBC, isCO, isBldg, isDayMode, dateRangeLabel, isLastPage);
  tbodyChunk.appendChild(totalTr);
  wrapperDiv.appendChild(tableChunk);
  return wrapperDiv;
};

/**
 * Main function to export tabular report data to a PDF file.
 */
export async function exportTableReportToPDF(params: ExportTableReportToPDFParams): Promise<void> {
  const { filteredResults, lguToRegion, fileLabel = "report", moduleLabel, selectedDateType, dateRangeLabel } = params;
  const generatedAt = new Date();
  const isBC = moduleLabel === "Barangay Clearance";
  const isCO = moduleLabel === "Certificate of Occupancy";
  const isBldg = moduleLabel === "Building Permit";
  const isBP = moduleLabel === "Business Permit";
  const isWP = moduleLabel === "Working Permit";
  const isDayMode = selectedDateType === "Day";
  let allRows: RowData[] = [];

  if (isDayMode) {
    filteredResults.forEach((lgu: any) => {
      const months = Array.isArray(lgu?.monthlyResults) ? lgu.monthlyResults : [];
      months.forEach((monthData: any) => {
        const regionKey = regionMapping[lgu?.region] || regionMapping[lgu?.regionCode] || lguToRegion?.[lgu?.lgu] || lgu?.region || lgu?.regionCode || "unknown";
        allRows.push({ regionKey, lgu, month: monthData?.month, monthData });
      });
    });
  } else {
    const regionGroups: Record<string, any[]> = {};
    filteredResults.forEach((lgu: any) => {
      const regionKey = regionMapping[lgu?.region] || regionMapping[lgu?.regionCode] || lguToRegion?.[lgu?.lgu] || lgu?.region || lgu?.regionCode || "unknown";
      if (!regionGroups[regionKey]) regionGroups[regionKey] = [];
      regionGroups[regionKey].push(lgu);
    });
    Object.entries(regionGroups).forEach(([regionKey, lguList]) => {
      lguList.forEach((lgu: any) => { allRows.push({ regionKey, lgu }); });
    });
  }

  const isSimpleReport = isBC || isCO || isBldg;
  // Keep PDF pagination consistent across report modules.
  const ROWS_PER_PAGE = 20;
  
  const rowChunks: RowData[][] = [];
  if (allRows.length > 0) {
    for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
      rowChunks.push(allRows.slice(i, i + ROWS_PER_PAGE));
    }
  } else {
    rowChunks.push([]);
  }

  const flushFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const modalTitle = moduleLabel ? `Generating ${moduleLabel} Report` : 'Compiling Your Document';
  const modalSubtitle = moduleLabel ? `Please wait, we're preparing your ${moduleLabel.toLowerCase()} data.` : 'Gathering data and creating the PDF...';

  await Swal.fire({
    width: 380,
    title: modalTitle,
    html: `
      <style>
        .swal-modal-container { display: flex; flex-direction: column; align-items: center; gap: 20px; padding-top: 10px; }
        .typewriter { --blue: #5C86FF; --blue-dark: #275EFE; --key: #fff; --paper: #EEF0FD; --text: #D3D4EC; --tool: #FBC56C; --duration: 3s; position: relative; -webkit-animation: bounce05 var(--duration) linear infinite; animation: bounce05 var(--duration) linear infinite; }
        .typewriter .slide { width: 92px; height: 20px; border-radius: 3px; margin-left: 14px; transform: translateX(14px); background: linear-gradient(var(--blue), var(--blue-dark)); -webkit-animation: slide05 var(--duration) ease infinite; animation: slide05 var(--duration) ease infinite; }
        .typewriter .slide:before, .typewriter .slide:after, .typewriter .slide i:before { content: ""; position: absolute; background: var(--tool); }
        .typewriter .slide:before { width: 2px; height: 8px; top: 6px; left: 100%; }
        .typewriter .slide:after { left: 94px; top: 3px; height: 14px; width: 6px; border-radius: 3px; }
        .typewriter .slide i { display: block; position: absolute; right: 100%; width: 6px; height: 4px; top: 4px; background: var(--tool); }
        .typewriter .slide i:before { right: 100%; top: -2px; width: 4px; border-radius: 2px; height: 14px; }
        .typewriter .paper { position: absolute; left: 24px; top: -26px; width: 40px; height: 46px; border-radius: 5px; background: var(--paper); transform: translateY(46px); -webkit-animation: paper05 var(--duration) linear infinite; animation: paper05 var(--duration) linear infinite; }
        .typewriter .paper:before { content: ""; position: absolute; left: 6px; right: 6px; top: 7px; border-radius: 2px; height: 4px; transform: scaleY(0.8); background: var(--text); box-shadow: 0 12px 0 var(--text), 0 24px 0 var(--text), 0 36px 0 var(--text); }
        .typewriter .keyboard { width: 120px; height: 56px; margin-top: -10px; z-index: 1; position: relative; }
        .typewriter .keyboard:before, .typewriter .keyboard:after { content: ""; position: absolute; }
        .typewriter .keyboard:before { top: 0; left: 0; right: 0; bottom: 0; border-radius: 7px; background: linear-gradient(135deg, var(--blue), var(--blue-dark)); transform: perspective(10px) rotateX(2deg); transform-origin: 50% 100%; }
        .typewriter .keyboard:after { left: 2px; top: 25px; width: 11px; height: 4px; border-radius: 2px; box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); -webkit-animation: keyboard05 var(--duration) linear infinite; animation: keyboard05 var(--duration) linear infinite; }
        @keyframes bounce05 { 85%, 92%, 100% { transform: translateY(0); } 89% { transform: translateY(-4px); } 95% { transform: translateY(2px); } }
        @keyframes slide05 { 5% { transform: translateX(14px); } 15%, 30% { transform: translateX(6px); } 40%, 55% { transform: translateX(0); } 65%, 70% { transform: translateX(-4px); } 80%, 89% { transform: translateX(-12px); } 100% { transform: translateX(14px); } }
        @keyframes paper05 { 5% { transform: translateY(46px); } 20%, 30% { transform: translateY(34px); } 40%, 55% { transform: translateY(22px); } 65%, 70% { transform: translateY(10px); } 80%, 85% { transform: translateY(0); } 92%, 100% { transform: translateY(46px); } }
        @keyframes keyboard05 { 5%, 12%, 21%, 30%, 39%, 48%, 57%, 66%, 75%, 84% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 9% { box-shadow: 15px 2px 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 18% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 2px 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 27% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 12px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 36% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 12px 0 var(--key), 60px 12px 0 var(--key), 68px 12px 0 var(--key), 83px 10px 0 var(--key); } 45% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 2px 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 54% { box-shadow: 15px 0 0 var(--key), 30px 2px 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 63% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 12px 0 var(--key); } 72% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 2px 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 81% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 12px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } }
        .swal-modal-subtitle { font-size: 1rem; color: #4b5563; margin-top: 5px; }
        .swal-progress-container { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 15px; }
        .swal-progress-bar-container { width: 90%; height: 8px; background-color: #e5e7eb; border-radius: 4px; }
        .swal-progress-bar-fill { width: 0%; height: 100%; background-color: #3b82f6; border-radius: 4px; transition: width 0.2s ease-out; }
        .swal-progress-label { font-size: 0.9rem; font-weight: 600; color: #374151; }
      </style>
      <div class="swal-modal-container">
        <div class="typewriter">
          <div class="slide"><i></i></div>
          <div class="paper"></div>
          <div class="keyboard"></div>
        </div>
        <p class="swal-modal-subtitle">${modalSubtitle}</p>
        <div class="swal-progress-container">
            <div class="swal-progress-bar-container">
              <div id="swal-progress-bar" class="swal-progress-bar-fill"></div>
            </div>
            <span id="swal-progress-label" class="swal-progress-label">0%</span>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      const progressBar = document.getElementById("swal-progress-bar") as HTMLElement | null;
      const progressLabel = document.getElementById("swal-progress-label") as HTMLElement | null;

      setTimeout(async () => {
        let pdf: jsPDF | null = null;
        try {
          const orientation = (isBP || isWP) ? "landscape" : "portrait";
          const isLandscape = orientation === "landscape";
          const pdfFormat = isLandscape ? [1190, 842] : "a4";
          pdf = new jsPDF({ orientation, unit: "pt", format: pdfFormat, compress: true, putOnlyUsedFonts: true } as any);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const marginX = isSimpleReport ? 8 : 20;
          const marginY = 20;
          
          let firstPageImgWidth = 0;

          const totalChunks = rowChunks.length > 0 ? rowChunks.length : 1;
          for (let i = 0; i < totalChunks; i++) {
            if (i > 0) pdf.addPage();
            const chunk = rowChunks[i] || [];
            const isLastPage = i === totalChunks - 1;
            const tableDiv = createPageContent(chunk, isLastPage, params, generatedAt, isSimpleReport, isBC, isCO, isBldg, isDayMode, isLandscape);
            const hiddenDiv = document.createElement("div");
            // place off-screen using transform so element remains "visible" to the rendering engine
            hiddenDiv.style.position = "absolute";
            hiddenDiv.style.left = "0";
            hiddenDiv.style.top = "0";
            hiddenDiv.style.transform = "translateX(-20000px)"; // safely off-screen
            hiddenDiv.style.display = "inline-block";
            hiddenDiv.style.zIndex = "9999";
            hiddenDiv.style.pointerEvents = "none";
            // ensure it's visible (not visibility:hidden) so html2canvas can capture it
            hiddenDiv.style.visibility = "visible";
            document.body.appendChild(hiddenDiv);
            hiddenDiv.appendChild(tableDiv);
            // allow layout to stabilize
            await flushFrame();
            // small extra delay helps with complex table layouts
            await new Promise(res => setTimeout(res, 120));
            // inline any external images to avoid tainting/cors issues
            try { await inlineImagesInElement(tableDiv); } catch (e) { /* continue even if inline fails */ }
            // wait for fonts to be ready (if supported)
            try { if ((document as any).fonts && (document as any).fonts.ready) await (document as any).fonts.ready; } catch (e) { }
            
            // Pass explicit dimensions so html2canvas captures the full table content (tbody included)
            const width = Math.max(tableDiv.scrollWidth, tableDiv.offsetWidth || 0);
            const height = Math.max(tableDiv.scrollHeight, tableDiv.offsetHeight || 0);
            const canvas = await html2canvas(tableDiv, {
              scale: 1.25,
              useCORS: true,
              backgroundColor: "#fff",
              width,
              height,
              windowWidth: width,
              windowHeight: height,
              scrollX: 0,
              scrollY: 0,
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.7);
            const maxWidth = pageWidth - marginX * 2;
            const maxHeight = pageHeight - marginY * 2;
            const imgAspectRatio = canvas.width / canvas.height || 1;
            
            let imgWidth, imgHeight;

            if (firstPageImgWidth === 0) {
              imgWidth = maxWidth;
              imgHeight = imgWidth / imgAspectRatio;
              if (imgHeight > maxHeight) {
                  imgHeight = maxHeight;
                  imgWidth = imgHeight * imgAspectRatio;
              }
              firstPageImgWidth = imgWidth;
            } else {
              imgWidth = firstPageImgWidth;
              imgHeight = imgWidth / imgAspectRatio;
            }

            const xPos = (pageWidth - imgWidth) / 2;
            pdf.addImage(imgData, "JPEG", xPos, marginY, imgWidth, imgHeight, undefined, "FAST");
            try { document.body.removeChild(hiddenDiv); } catch {}
            try { const ctx = canvas.getContext("2d"); if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); (canvas as any).width = 1; (canvas as any).height = 1; } catch {}
            
            const progress = Math.round(((i + 1) / totalChunks) * 100);
            if (progressBar && progressLabel) {
              progressBar.style.width = `${progress}%`;
              progressLabel.textContent = `${progress}%`;
            }
            if ((i + 1) % 5 === 0) await flushFrame();
          }
          
          if (progressBar && progressLabel) {
            progressBar.style.width = `100%`;
            progressLabel.textContent = `100%`;
            await flushFrame();
          }
          pdf.save(buildPdfFileName(moduleLabel || fileLabel, dateRangeLabel, fileLabel));
        } catch (err) {
          console.error("Failed to generate PDF:", err);
          await Swal.fire({ icon: "error", title: "PDF Generation Failed", text: "Please try again or adjust your filters.", timer: 2000, showConfirmButton: false });
        } finally {
          Swal.close();
        }
      }, 50);
    },
  });
}

