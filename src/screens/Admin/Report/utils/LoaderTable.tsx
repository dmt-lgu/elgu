import { TableRow, TableCell } from "@/components/ui/table";

type Props = {
  columns?: number;
  columnWidths?: string[];
};

const DEFAULT_FOUR_COLUMN_WIDTHS = [
  "w-32",
  "w-48",
  "w-24",
  "w-24",
];

const LoaderTable = ({
  columns = 4,
  columnWidths = DEFAULT_FOUR_COLUMN_WIDTHS,
}: Props) => {
  return (
    <TableRow>
      {Array.from({ length: columns }).map((_, c) => (
        <TableCell 
          key={c} 
          // Ania ang kausaban: Gidugang ang 'text-center'
          className="px-2 py-3 text-center"
        >
          <div
            className={`h-5 ${
              columnWidths[c] || "w-full"
            // Gidugang ang 'inline-block' para masiguro ang behavior
            } bg-gray-200 rounded-md animate-pulse inline-block`}
          />
        </TableCell>
      ))}
    </TableRow>
  );
};

export default LoaderTable;