import { TableRow, TableCell } from "@/components/ui/table";

type Props = {
  rows?: number;
  columns?: number;
  /**
   * An array of Tailwind CSS width classes (e.g., ['w-14', 'w-40', 'w-auto']).
   * The order of the classes should match the order of the columns.
   */
  columnWidths?: string[];
};

// A default set of widths to ensure the component works even if `columnWidths` isn't provided.
// This matches the original behavior.
const DEFAULT_COLUMN_WIDTHS = [
  "w-14",
  "w-40",
  "w-16", "w-16", "w-16", "w-16",
  "w-16", "w-16", "w-16", "w-16",
  "w-16", "w-16", "w-16",
  "w-16", "w-16", "w-16",
];

const LoaderTable = ({
  rows = 6,
  columns = 16,
  columnWidths = DEFAULT_COLUMN_WIDTHS,
}: Props) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c} className="px-2 py-2">
              <div
                className={`h-4 ${
                  // Use the width from the prop array, or a fallback if not enough widths are provided.
                  columnWidths[c] || "w-full"
                } bg-gray-200 rounded animate-pulse`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export default LoaderTable;