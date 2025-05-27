
import FilterSection from "./components/FilterSection"
import TableReport from "./table/TableReport"


function Reports() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto  bg-background ">
      <FilterSection />

      <TableReport />
     </div>
    
  )
}

export default Reports
