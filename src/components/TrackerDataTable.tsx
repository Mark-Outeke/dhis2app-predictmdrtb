import React, { useState, useCallback, useEffect } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import Sidebar from './SideBar';
import {DataTable, DataTableHead, DataTableBody, DataTableRow,DataTableCell, CircularLoader, DataTableColumnHeader, Pagination, DataTableRowProps} from '@dhis2/ui';
import { useHistory } from 'react-router-dom';
import './TrackerDataTable.css';

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
        pager: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
        };
    };
};

// Custom DataTable Row
interface CustomDataTableRowProps extends DataTableRowProps {
  onClick?: () => void;
}

const CustomDataTableRow: React.FC<CustomDataTableRowProps> = ({ onClick, children, ...props }) => {
  return (
    <DataTableRow {...props as any} onClick={onClick} style={{ cursor: 'pointer', width: '100%' }}>
        {children}
    </DataTableRow>
  );
};

interface TrackerDataTableProps {
    onEntitySelect?: (entity: TrackedEntityInstance) => void;
}

export default function TrackerDataTable({ onEntitySelect }: TrackerDataTableProps = {}) {
    const history = useHistory();
    
    // State management
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<TrackedEntityInstance | null>(null);

    // Debounce search term to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to first page when searching
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Create query object that changes when pagination or search changes
    const queryParams: any = {
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
        page: page,
        pageSize: pageSize,
        totalPages: true,
        order: 'created:desc',
    };

    // Add search filters if search term exists
    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        const searchFilters = [
            `ZkNZOxS24k7:ilike:${debouncedSearchTerm}`,
            `ENRjVGxVL6l:ilike:${debouncedSearchTerm}`,
            `sB1IHYu2xQT:ilike:${debouncedSearchTerm}`,
            `jWjSY7cktaQ:ilike:${debouncedSearchTerm}`,
            `Ewi7FUfcHAD:ilike:${debouncedSearchTerm}`,
        ];
        queryParams.filter = searchFilters.join(',');
    }

    // The query object that will trigger re-fetching when it changes
    const query = {
        trackedEntities: {
            resource: 'trackedEntityInstances',
            params: queryParams,
        },
    };
    
    // Use the dynamic query
    const { loading, error, data } = useDataQuery<QueryResult>(query);

    // Early returns for loading and error states
    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;

    const instances = data?.trackedEntities?.trackedEntityInstances || [];
    const pager = data?.trackedEntities?.pager;

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    // These handlers will trigger re-renders and new queries
    const handlePageChange = useCallback((newPage: number) => {
        console.log('Page changed to:', newPage); // Debug log
        setPage(newPage);
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        console.log('Page size changed to:', newPageSize); // Debug log
        const numericPageSize = (newPageSize);
        setPageSize(numericPageSize);
        setPage(1); // Reset to first page when changing page size
    }, []);

    const rows = instances.map((instance) => {
        const getAttribute = (code: string) =>
            instance.attributes.find((attr) => attr.attribute === code)?.value || '';

        const enrollment = instance.enrollments[0];
        const handleRowClick = () => {
            setSelectedEntity(instance);
            onEntitySelect?.(instance);
            history.push(`/TrackedEntityDetails/${instance.trackedEntityInstance}`);
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

    // Debug logs
    console.log('Current page:', page);
    console.log('Current pageSize:', pageSize);
    console.log('Pager data:', pager);
    console.log('Total instances:', instances.length);

    return (
        <div className="layout">
            <Sidebar selectedEntity={selectedEntity} />
            <div className="content">
                <div style={{ marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="Search entire database (Name, ID, TB Number)..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{ 
                            padding: '10px', 
                            width: '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    />
                    {loading && (
                        <div style={{ marginTop: '10px', color: '#666' }}>
                            Searching entire database...
                        </div>
                    )}
                </div>
                
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
                </DataTable>

                {pager && (
                    <Pagination
                        page={pager.page}
                        pageSize={pager.pageSize}
                        pageCount={pager.pageCount}
                        total={pager.total}
                        hidePageSelect={false}
                        hidePageSummary={false}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        pageSizes={["10", "25", "50", "100"]}
                    />
                )}

                {pager && (
                    <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                        {searchTerm ? (
                            <>Found {pager.total} results in entire database for "{searchTerm}" (newest first)</>
                        ) : (
                            <>Showing {((pager.page - 1) * pager.pageSize) + 1} to {Math.min(pager.page * pager.pageSize, pager.total)} of {pager.total} total records (newest first)</>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}