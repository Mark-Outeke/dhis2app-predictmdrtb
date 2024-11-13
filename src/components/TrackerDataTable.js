import React from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, CircularLoader, DataTableColumnHeader  } from '@dhis2/ui';
import './TrackerDataTable.css'
import { Pagination } from '@dhis2/ui';
//import { useNavigate } from 'react-router-dom'




const query = {
    trackedEntities: {
    resource:   "trackedEntityInstances",
    params: {
    ou:         "akV6429SUqu",
    ouMode:     "DESCENDANTS",
    program:    "wfd9K4dQVDR", 
      fields: [
                "trackedEntityInstance",
                "orgUnitName",               
                "created",                   
                "attributes",
                "enrollments",  
                "coordinates",               
      ],
      
      pageSize: 50
     
    },
  },
};



    


export default function TrackerDataTable() {
    const { loading, error, data } = useDataQuery(query);
    //const navigate = useNavigate()

    //const handleRowClick = (item) => {
   //   navigate(`/TrackedEntityDetails${item.trackedEntityInstance}`)
   // }
    
   
    
    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;
    
    console.log('data', data);
    
    
    
  
    const rows = data.trackedEntities.trackedEntityInstances.map((instance) => {
      const getAttribute = (code) => instance.attributes.find(attr => attr.attribute === code)?.value || '';
      const enrollment = instance.enrollments[0];
      return (
        <DataTableRow key={instance.trackedEntityInstance}
       // onClick={() => handleRowClick(instance)}
       // style={{ cursor: 'pointer' }}
       >
          <DataTableCell>{enrollment?.orgUnitName}</DataTableCell> {/* Registering Unit */}
          <DataTableCell>{new Date(instance.created).toLocaleDateString()}</DataTableCell> {/* Registration Date */}
          <DataTableCell>{getAttribute('ZkNZOxS24k7')}</DataTableCell> {/* Unit TB No/DR TB No/Leprosy N */}
          <DataTableCell>{getAttribute('ENRjVGxVL6l')}</DataTableCell> {/* Last Name */}
          <DataTableCell>{getAttribute('sB1IHYu2xQT')}</DataTableCell> {/* First Name */}
          <DataTableCell>{getAttribute('jWjSY7cktaQ')}</DataTableCell> {/* Patient Name */}
          <DataTableCell>{getAttribute('Ewi7FUfcHAD')}</DataTableCell> {/* National ID */}
          <DataTableCell>{getAttribute('DlbNh6q1hDq')}</DataTableCell> {/* GIS Coordinates */}
          <DataTableCell>{getAttribute('Gy1jHsTp9P6')}</DataTableCell> {/* Age in years */}
          <DataTableCell>{getAttribute('GnL13HAVFOm')}</DataTableCell> {/* Sex */}
        </DataTableRow>
      );
    });

    
    return (
        
         <DataTable className="table-fixed-header">
            <DataTableHead>
                <DataTableRow>
                    <DataTableColumnHeader
                    name="firstName"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name" >
        Registering Unit</DataTableColumnHeader>
                    <DataTableColumnHeader name="Registration Date"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">Registration Date</DataTableColumnHeader>
                    <DataTableColumnHeader name="DSATR-002 Unit TB No/DR TB No/Leprosy N"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">DSATR-002 Unit TB No/DR TB No/Leprosy N</DataTableColumnHeader>
                    <DataTableColumnHeader name="Last Name"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">Last Name</DataTableColumnHeader>
                    <DataTableColumnHeader name="First Name"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">First Name</DataTableColumnHeader>
        <DataTableColumnHeader name="NTLP-01: Patient Name"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">NTLP-01: Patient Name</DataTableColumnHeader>
                    <DataTableColumnHeader name="National ID"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">National ID</DataTableColumnHeader>
                    <DataTableColumnHeader>GIS Coordinates</DataTableColumnHeader>
                    
                    <DataTableColumnHeader name="NTLP-02: Age in years"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">NTLP-02: Age in years</DataTableColumnHeader>
                    <DataTableColumnHeader name="NTLP-04: Sex"
        onSortIconClick={function w(){}}
        sortDirection="default"
        sortIconTitle="Sort by first name">NTLP-04: Sex</DataTableColumnHeader>
                </DataTableRow>
            </DataTableHead>
            <DataTableBody>{rows}</DataTableBody>
            <Pagination
                    page={2}
                    onPageChange={function w(){}}
                    onPageSizeChange={function w(){}}
                    pageCount={10}
                    pageSize={50}
                    total={430}
                    hidePageSelect
                    hidePageSummary
                />
        </DataTable>
        
            
);
}
  