import React, { useRef, useState, useEffect } from 'react';
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import TableReport from './table/TableReport';
import FilterSection from './components/FilterSection';
import { FilterState } from './utils/types';
import axios from '../../../plugin/axios';
import { regionMapping } from '../../../screens/Admin/Report/utils/mockData'

const Reports: React.FC = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    selectedModules: [],
    selectedRegions: [],
    dateRange: {
      start: null,
      end: null,
    },
  });

  const [tableData, setTableData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // LGU to Region mapping state
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);

  const tableRef = useRef<HTMLDivElement>(null);

  const fetchLguToRegion = async () => {
    setLguRegionLoading(true);
    try {
      const res = await axios.get("lgu-list");
      const data = res.data;
      const mapping: Record<string, string> = {};
      Object.entries(data).forEach(([regionKey, lguList]) => {
        (lguList as string[]).forEach(lguName => {
          // Use regionMapping for display label, fallback to regionKey if not found
          mapping[lguName] = regionMapping[regionKey] || regionKey;
        });
      });
      setLguToRegion(mapping);
    } catch (error) {
      setLguToRegion({});
    } finally {
      setLguRegionLoading(false);
    }
  };

  useEffect(() => {
    fetchLguToRegion();
  }, []);

  // Fetch data when filterState changes
  useEffect(() => {
    const transaction = async () => {
      if (!filterState.selectedRegions.length && !filterState.dateRange.start && !filterState.dateRange.end) {
        setTableData(null);
        return;
      }
      setLoading(true);
      try {
        const payload = {
          locationName: filterState.selectedRegions,
          startDate: filterState.dateRange.start
            ? filterState.dateRange.start.toISOString().slice(0, 10)
            : null,
          endDate: filterState.dateRange.end
            ? filterState.dateRange.end.toISOString().slice(0, 10)
            : null,
        };
        const response = await axios.post('transaction-count', payload);
        setTableData(response.data);
      } catch (error) {
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };
    transaction();
  }, [filterState]);

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
    <div className='p-6 max-w-[1200px] mx-auto bg-background'>
      <FilterSection
        filterState={filterState}
        setFilterState={setFilterState}
        onDownload={handleDownload}
      />
      <TableReport
        ref={tableRef}
        selectedRegions={filterState.selectedRegions}
        dateRange={filterState.dateRange}
        apiData={tableData}
        loading={loading || lguRegionLoading}
        lguToRegion={lguToRegion}
      />
    </div>
  );
};

export default Reports;