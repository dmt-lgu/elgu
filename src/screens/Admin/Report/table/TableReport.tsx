import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EyeIcon } from "lucide-react"

function TableReport() {
  return (
   <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold uppercase  mb-4">Report Table</h2>

      <Input 
      className="w-[280px] md:w-full"
      placeholder='Search...'
      />
    </div>
    
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="text-sm font-medium text-secondary-foreground">Module</TableHead>
                <TableHead className="text-sm font-medium text-secondary-foreground">Region</TableHead>
                <TableHead className="text-sm font-medium text-secondary-foreground">Date from</TableHead>
                <TableHead className="text-sm font-medium text-secondary-foreground">Date to</TableHead>
                <TableHead className="text-sm font-medium text-secondary-foreground">Action</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            <TableRow>
                <TableCell>Business Permit</TableCell>
                <TableCell>R10</TableCell>
                <TableCell>May 15, 2025</TableCell>
                <TableCell>May 25, 2025</TableCell>
                <TableCell>
                    <Button className="w-8 h-8 ">
                        <EyeIcon className="text-accent"/>
                    </Button>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>

    </div>
  )
}

export default TableReport
