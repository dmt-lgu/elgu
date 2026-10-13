import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { ExportPreview } from '../utils/reportGenerator';

interface ExportPreviewModalProps {
  previews: ExportPreview[];
  onClose: () => void;
}

const EXCEL_PREVIEW_STYLES = `
  body { margin: 0; padding: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111827; }
  table { border-collapse: collapse; }
  td { border: 1px solid #cbd5e1; padding: 6px 8px; white-space: pre-line; text-align: right; }
  td:nth-child(-n+3) { text-align: left; }
  tr:nth-child(-n+2) td { background: #9ec6f7; font-weight: bold; text-align: center; }
  tr:last-child td { background: #1e293b; color: #ffffff; font-weight: bold; }
`;

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ previews, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { setActiveIndex(0); }, [previews]);

  if (previews.length === 0) return null;
  const active = previews[Math.min(activeIndex, previews.length - 1)];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-[95vw] flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{active.type === 'pdf' ? 'PDF' : 'Excel'} Preview</h2>
            <p className="truncate text-xs text-slate-500">{active.fileName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
        </div>

        {previews.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-4 py-2">
            {previews.map((preview, index) => (
              <button
                key={preview.fileName}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${index === activeIndex ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {preview.moduleLabel}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 bg-slate-100">
          {active.type === 'pdf' ? (
            <iframe key={active.fileName} title={active.fileName} src={active.url} className="h-full w-full border-0" />
          ) : (
            <iframe key={active.fileName} title={active.fileName} srcDoc={`<style>${EXCEL_PREVIEW_STYLES}</style>${active.html || ''}`} className="h-full w-full border-0 bg-white" />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button type="button" variant="outline" className="text-xs" onClick={onClose}>Close</Button>
          {previews.length > 1 && (
            <Button type="button" variant="outline" className="text-xs" onClick={() => previews.forEach(preview => preview.save())}>Download All</Button>
          )}
          <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white text-xs" onClick={() => active.save()}>Download</Button>
        </div>
      </div>
    </div>
  );
};

export default ExportPreviewModal;
