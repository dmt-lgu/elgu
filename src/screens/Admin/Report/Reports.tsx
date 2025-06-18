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
    selectedProvinces: [], 
    selectedCities: [],
    dateRange: {
      start: null,
      end: null,
    },
  });

  const [searchFilters, setSearchFilters] = useState<FilterState>(filterState);
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

  // Fetch data when searchFilters changes (i.e., after Search button)
  useEffect(() => {
    const transaction = async () => {
      if (
        !searchFilters.selectedRegions.length &&
        !searchFilters.selectedProvinces?.length &&
        !searchFilters.dateRange.start &&
        !searchFilters.dateRange.end
      ) {
        setTableData(null);
        return;
      }
      setLoading(true);
      try {
        const payload: any = {
          locationName: searchFilters.selectedRegions,
          startDate: searchFilters.dateRange.start
            ? searchFilters.dateRange.start.toISOString().slice(0, 10)
            : null,
          endDate: searchFilters.dateRange.end
            ? searchFilters.dateRange.end.toISOString().slice(0, 10)
            : null,
        };
        // Optionally, send selectedProvinces to the API if supported
        if (searchFilters.selectedProvinces && searchFilters.selectedProvinces.length > 0) {
          payload.provinces = searchFilters.selectedProvinces;
        }
        const response = await axios.post('transaction-count', payload);
        setTableData(response.data);
      } catch (error) {
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };
    transaction();
  }, [searchFilters]);

  const handleDownload = async (type: "pdf" | "excel") => {
    if (!tableRef.current) return;

    if (type === "excel") {
      const table = tableRef.current.querySelector("table");
      if (!table) return;
      const wb = XLSX.utils.table_to_book(table);
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), "report.xlsx");
    } else if (type === "pdf") {
      const tableElement = tableRef.current;
      setTimeout(async () => {
        const canvas = await html2canvas(tableElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#fff",
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "pt",
          format: "a4",
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let imgY = 20;
        if (imgHeight < pageHeight - 40) {
          pdf.addImage(imgData, "PNG", 20, imgY, imgWidth, imgHeight);
        } else {
          let renderedHeight = 0;
          while (renderedHeight < imgHeight) {
            pdf.addImage(
              imgData,
              "PNG",
              20,
              imgY,
              imgWidth,
              imgHeight,
              undefined,
              "FAST"
            );
            renderedHeight += pageHeight - 40;
            if (renderedHeight < imgHeight) {
              pdf.addPage();
              imgY = 20 - renderedHeight;
            }
          }
        }
        pdf.save("report.pdf");
      }, 300);
    }
  };

  // Handler for Search button
  const handleSearch = (filters: FilterState) => {
    setSearchFilters({ ...filters });
  };

  // Handler for Reset button: reset all except modules and clear TableReport data
  const handleReset = () => {
    setFilterState(prev => ({
      ...prev,
      selectedRegions: [],
      selectedProvinces: [],
      dateRange: { start: null, end: null },
    }));
    setSearchFilters(prev => ({
      ...prev,
      selectedRegions: [],
      selectedProvinces: [],
      dateRange: { start: null, end: null },
    }));
    setTableData(null);
  };

  return (
    <div className='p-6 max-w-[1200px] mx-auto bg-background'>
      <FilterSection
        filterState={filterState}
        setFilterState={setFilterState}
        onSearch={handleSearch}
        onDownload={handleDownload}
        onReset={handleReset}
      />
      <TableReport
        ref={tableRef}
        selectedRegions={searchFilters.selectedRegions}
        dateRange={searchFilters.dateRange}
        apiData={tableData}
        loading={loading || lguRegionLoading}
        lguToRegion={lguToRegion}
        selectedProvinces={searchFilters.selectedProvinces}
        selectedCities={searchFilters.selectedCities} // <-- add this
      />
    </div>
  );
};

export default Reports;