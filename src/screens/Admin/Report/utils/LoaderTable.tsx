import { TableRow, TableCell } from "@/components/ui/table";

type Props = { rows?: number; columns?: number };

const LoaderTable = ({ rows = 6, columns = 16 }: Props) => {
  const widthByCol = (idx: number) =>
    idx === 0 ? "w-14" : idx === 1 ? "w-40" : "w-16";

  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c} className="px-2 py-2">
              <div className={`h-4 ${widthByCol(c)} bg-gray-200 rounded animate-pulse`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export default LoaderTable;