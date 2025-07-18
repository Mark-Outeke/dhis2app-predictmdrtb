import React, { useState, useCallback, useEffect } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import Sidebar from './SideBar';
import {DataTable, DataTableHead, DataTableBody, DataTableRow,DataTableCell, CircularLoader, DataTableColumnHeader, Pagination, DataTableRowProps} from '@dhis2/ui';
import { useHistory } from 'react-router-dom';
import './TrackerDataTable.css';

// Base query definition
const createQuery = (searchTerm: string = '', page: number = 1, pageSize: number = 50) => {
    const params: any = {
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
    };

    // Add search filters if search term exists
    if (searchTerm && searchTerm.trim()) {
        // Search across multiple attributes using DHIS2 API filters
        // You can add multiple attribute filters for comprehensive search
        params.filter = [
            `ZkNZOxS24k7:ilike:${searchTerm}`, // Unit TB No/DR TB No/Leprosy N
            `ENRjVGxVL6l:ilike:${searchTerm}`, // Last Name
            `sB1IHYu2xQT:ilike:${searchTerm}`, // First Name
            `jWjSY7cktaQ:ilike:${searchTerm}`, // Patient Name
            `Ewi7FUfcHAD:ilike:${searchTerm}`, // National ID
        ];
    }

    return {
        trackedEntities: {
            resource: 'trackedEntityInstances',
            params,
        },
    };
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
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Create dynamic query based on search term and pagination
    const query = createQuery(debouncedSearchTerm, page, pageSize);
    
    // Use the dynamic query
    const { loading, error, data, refetch } = useDataQuery<QueryResult>(query);

    // Refetch when search term or pagination changes
    useEffect(() => {
        if (refetch) {
            refetch({
                trackedEntities: {
                    resource: 'trackedEntityInstances',
                    params: createQuery(debouncedSearchTerm, page, pageSize).trackedEntities.params,
                },
            });
        }
    }, [debouncedSearchTerm, page, pageSize, refetch]);

    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;

    const instances = data?.trackedEntities?.trackedEntityInstances || [];
    const pager = data?.trackedEntities?.pager;

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setPage(1);
    };

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

    return (
        <div className="layout">
            <Sidebar selectedEntity={selectedEntity} />
            <div className="content">
                <div style={{ marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="Search across all patients (Name, ID, TB Number)..."
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
                            Searching...
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
                    />
                )}

                {pager && (
                    <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                        Showing {((pager.page - 1) * pager.pageSize) + 1} to {Math.min(pager.page * pager.pageSize, pager.total)} of {pager.total} results
                        {searchTerm && ` for "${searchTerm}"`}
                    </div>
                )}
            </div>
        </div>
    );
}