import React, { useRef, useState } from 'react';
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import TableReport from './table/TableReport';
import FilterSection from './components/FilterSection';

const Reports: React.FC = () => {
  const [filterState, setFilterState] = useState<any>({
    selectedModules: [],
    selectedRegions: [],
    dateRange: {
      start: null,
      end: null,
    },
  });

  const tableRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (type: "pdf" | "excel") => {
    if (!tableRef.current) return;

    if (type === "excel") {
      const table = tableRef.current.querySelector("table");
      if (!table) return;
      const wb = XLSX.utils.table_to_book(table);
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), "report.xlsx");
    } else if (type === "pdf") {
      const canvas = await html2canvas(tableRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("report.pdf");
    }
  };

  return (
    <div className='p-6 max-w-[1200px] mx-auto  bg-background'>
      <FilterSection
        filterState={filterState}
        setFilterState={setFilterState}
        onDownload={handleDownload}
      />
      <TableReport
        ref={tableRef}
        selectedRegions={filterState.selectedRegions}
        dateRange={filterState.dateRange}
      />
    </div>
  );
};

export default Reports;