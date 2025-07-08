import React, { useState } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import Sidebar from './SideBar';
import {DataTable, DataTableHead, DataTableBody, DataTableRow,DataTableCell, CircularLoader, DataTableColumnHeader, Pagination, DataTableRowProps} from '@dhis2/ui';
import { useHistory } from 'react-router-dom';
import './TrackerDataTable.css';
 

// Query definition
const query = {
    trackedEntities: {
        resource: 'trackedEntityInstances',
        params: {
            ou: 'akV6429SUqu',
            ouMode: 'DESCENDANTS',
            program: 'wfd9K4dQVDR',
          
            fields: [
                'trackedEntityInstance',
                'orgUnitName',
                'created',
                'attributes',
                'enrollments',
                'coordinates',
            ],
            paging: false,
        },
    },
};

// Type definitions for query results
type Attribute = {
    attribute: string;
    value: string;
};

type Enrollment = {
    orgUnitName: string;
    orgUnit: string;
};

export type TrackedEntityInstance = {
    trackedEntityInstance: string;
    orgUnitName: string;
    created: string;
    attributes: Attribute[];
    enrollments: Enrollment[];
    orgUnit: string;
};

type QueryResult = {
    trackedEntities: {
        trackedEntityInstances: TrackedEntityInstance[];
    };
};

// Custom DataTable Row
interface CustomDataTableRowProps extends DataTableRowProps {
  onClick?: () => void;
}


const CustomDataTableRow: React.FC<CustomDataTableRowProps> = ({ onClick, children, ...props   }) => {
  return (
    <DataTableRow {...props as any} onClick={onClick} style={{ cursor: 'pointer', width: '100%' }}>
        {children}
    
</DataTableRow>
  );
};

// Add a new prop type for the TrackerDataTable
interface TrackerDataTableProps {
    onEntitySelect: (entity: TrackedEntityInstance) => void; // Prop to handle selected entity
}


export default function TrackerDataTable({ onEntitySelect }: TrackerDataTableProps) {
    const { loading, error, data } = useDataQuery<QueryResult>(query);
    const history = useHistory();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');

    

    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;

    // Filter rows based on searchTerm
    const filteredRows = data?.trackedEntities?.trackedEntityInstances.filter((instance) => {
    // Check if attributes is defined and not empty
    if (!instance.attributes) return false;

    // Combine all searchable fields into a single string
    const searchableFields = [
        instance.orgUnitName,
        instance.orgUnit,
        instance.created,
        ...instance.attributes.map(attr => attr.value),
        ...instance.enrollments.map(enrollment => enrollment.orgUnitName || '')
    ].filter(Boolean).join(' ').toLowerCase();

    // Search within the combined string
    return searchableFields.includes(searchTerm.toLowerCase());
}) || [];



  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
  };

  // Calculate the current rows to display based on pagination
  const startIndex = (page - 1) * pageSize;
  const currentRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const rows = currentRows.map((instance) => {
      const getAttribute = (code: string) =>
          instance.attributes.find((attr) => attr.attribute === code)?.value || '';

        const enrollment = instance.enrollments[0];
        const handleRowClick = () => {
            onEntitySelect(instance); // Call the parent function to pass the entity
            history.push(`/TrackedEntityDetails/${instance.trackedEntityInstance}`); // Navigate to details page
        };

        return (
          <CustomDataTableRow key={instance.trackedEntityInstance} onClick={handleRowClick}>
                    <DataTableCell>{enrollment?.orgUnitName || 'N/A'}</DataTableCell>
                    <DataTableCell>{new Date(instance.created).toLocaleDateString()}</DataTableCell>
                    <DataTableCell>{getAttribute('ZkNZOxS24k7')}</DataTableCell>
                    <DataTableCell>{getAttribute('ENRjVGxVL6l')}</DataTableCell>
                    <DataTableCell>{getAttribute('sB1IHYu2xQT')}</DataTableCell>
                    <DataTableCell>{getAttribute('jWjSY7cktaQ')}</DataTableCell>
                    <DataTableCell>{getAttribute('Ewi7FUfcHAD')}</DataTableCell>
                  
                    <DataTableCell>{getAttribute('Gy1jHsTp9P6')}</DataTableCell>
                    <DataTableCell>{getAttribute('GnL13HAVFOm')}</DataTableCell>
                </CustomDataTableRow>
        );
    });

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setPage(1);
    };

    return (
      <div className="layout"> {/* Add layout styling */}
            <Sidebar />
            <div className="content"> {/* Content area for the table */}
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{ marginBottom: '20px', padding: '10px', width: '100%' }}
                />
        <DataTable className="table-fixed-header">
          
            <DataTableHead>
                <DataTableRow>
                    <DataTableColumnHeader>Registering Unit</DataTableColumnHeader>
                    <DataTableColumnHeader>Registration Date</DataTableColumnHeader>
                    <DataTableColumnHeader>Unit TB No/DR TB No/Leprosy N</DataTableColumnHeader>
                    <DataTableColumnHeader>Last Name</DataTableColumnHeader>
                    <DataTableColumnHeader>First Name</DataTableColumnHeader>
                    <DataTableColumnHeader>Patient Name</DataTableColumnHeader>
                    <DataTableColumnHeader>National ID</DataTableColumnHeader>
                    
                    <DataTableColumnHeader>Age in years</DataTableColumnHeader>
                    <DataTableColumnHeader>Sex</DataTableColumnHeader>
                </DataTableRow>
            </DataTableHead>
            <DataTableBody>{rows}</DataTableBody>
            <Pagination
                page={page}
                pageSize={pageSize}
                pageCount={Math.ceil(filteredRows.length / pageSize)} // Replace with dynamic total pages if available
                total={filteredRows.length} // Replace with the actual total count if available
                hidePageSelect
                hidePageSummary
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />
        </DataTable>
        </div>
      </div>
    );
}
