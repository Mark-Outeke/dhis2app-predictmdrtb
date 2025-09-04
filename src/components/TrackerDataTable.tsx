import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import Sidebar from './SideBar';
import {
    DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, 
    CircularLoader, DataTableColumnHeader, DataTableRowProps,
    SingleSelectField, SingleSelectOption, InputField, Button
} from '@dhis2/ui';
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

// Sorting types - updated to match DHIS2 UI expectations
type SortDirection = 'asc' | 'desc' | 'default';
type SortableField = 'created' | 'orgUnitName' | 'ZkNZOxS24k7' | 'ENRjVGxVL6l' | 'sB1IHYu2xQT' | 'jWjSY7cktaQ' | 'Ewi7FUfcHAD' | 'Gy1jHsTp9P6' | 'GnL13HAVFOm';

interface SortConfig {
    column: SortableField;
    direction: SortDirection;
}

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

// Define columns similar to TableTesting.tsx pattern
const columns = [
    { id: 'orgUnitName', label: 'Registering Unit', field: 'orgUnitName' },
    { id: 'created', label: 'Registration Date', field: 'created' },
    { id: 'ZkNZOxS24k7', label: 'Unit TB No/DR TB No/Leprosy N', field: 'ZkNZOxS24k7' },
    { id: 'ENRjVGxVL6l', label: 'Last Name', field: 'ENRjVGxVL6l' },
    { id: 'sB1IHYu2xQT', label: 'First Name', field: 'sB1IHYu2xQT' },
    { id: 'jWjSY7cktaQ', label: 'Patient Name', field: 'jWjSY7cktaQ' },
    { id: 'Ewi7FUfcHAD', label: 'National ID', field: 'Ewi7FUfcHAD' },
    { id: 'Gy1jHsTp9P6', label: 'Age in years', field: 'Gy1jHsTp9P6' },
    { id: 'GnL13HAVFOm', label: 'Sex', field: 'GnL13HAVFOm' },
];

// Page size options similar to TableTesting.tsx
const pageSizeOptions = [
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' },
    { value: '200', label: '200 per page' },
];

// Search type options similar to TableTesting.tsx
const searchTypeOptions = [
    { value: 'all', label: 'All Fields' },
    { value: 'jWjSY7cktaQ', label: 'Patient Name' },
    { value: 'ZkNZOxS24k7', label: 'TB Number' },
    { value: 'orgUnit', label: 'Org Unit Name' },
    { value: 'ENRjVGxVL6l', label: 'Last Name' },
    { value: 'sB1IHYu2xQT', label: 'First Name' },
    { value: 'Ewi7FUfcHAD', label: 'National ID' },
];

// Dynamic query with server-side sorting and filtering - similar to TableTesting.tsx
const query = {
    trackedEntities: {
        resource: 'trackedEntityInstances',
        params: ({ ou, program, page, pageSize, order, filter }: any) => ({
            ou,
            ouMode: 'DESCENDANTS',
            program,
            fields: [
                'trackedEntityInstance',
                'orgUnitName',
                'created',
                'attributes[attribute,value]',
                'enrollments[orgUnit,orgUnitName]',
                'coordinates',
            ].join(','),
            page,
            pageSize,
            order,
            totalPages: true,
            paging: true,
            ...(filter ? { filter } : {}),
        }),
    },
};

// Helper function to get attribute value
const getAttr = (tei: TrackedEntityInstance, id: string) =>
    tei.attributes?.find(a => a.attribute === id)?.value ?? '';

export default function TrackerDataTable({ onEntitySelect }: TrackerDataTableProps = {}) {
    const history = useHistory();
    
    // ALL HOOKS MUST BE AT THE TOP - following TableTesting.tsx pattern
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [appliedSearchType, setAppliedSearchType] = useState('all');
    const [selectedEntity, setSelectedEntity] = useState<TrackedEntityInstance | null>(null);
    
    // Server-side sorting state - following TableTesting.tsx pattern
    const [sort, setSort] = useState<SortConfig>({ column: 'created', direction: 'desc' });

    // Create order string for server-side sorting - following TableTesting.tsx pattern
    const order = useMemo(() => `${sort.column}:${sort.direction}`, [sort]);

    // Build filter string based on search type and term - following TableTesting.tsx pattern
    const filter = useMemo(() => {
        if (!appliedSearch.trim()) return '';

        const searchValue = appliedSearch.trim();
        
        if (appliedSearchType === 'all') {
            // Search across multiple fields
            return [
                `jWjSY7cktaQ:LIKE:${searchValue}`, // Patient Name
                `ZkNZOxS24k7:LIKE:${searchValue}`, // TB Number
                `ENRjVGxVL6l:LIKE:${searchValue}`, // Last Name
                `sB1IHYu2xQT:LIKE:${searchValue}`, // First Name
                `Ewi7FUfcHAD:LIKE:${searchValue}`, // National ID
            ].join(',');
        } else if (appliedSearchType === 'orgUnit') {
            // For org unit, we'll handle this client-side
            return '';
        } else {
            // Search specific attribute
            return `${appliedSearchType}:LIKE:${searchValue}`;
        }
    }, [appliedSearch, appliedSearchType]);

    // Data query - following TableTesting.tsx pattern
    const { loading, error, data, refetch } = useDataQuery<QueryResult>(query, {
        variables: {
            ou: 'akV6429SUqu',
            program: 'wfd9K4dQVDR',
            page,
            pageSize,
            order,
            filter,
        },
    });

    // Refetch whenever dependencies change - following TableTesting.tsx pattern
    useEffect(() => {
        refetch({ 
            ou: 'akV6429SUqu', 
            program: 'wfd9K4dQVDR', 
            page, 
            pageSize, 
            order, 
            filter 
        });
    }, [page, pageSize, order, filter, refetch]);

    // Client-side filtering for org unit if needed - following TableTesting.tsx pattern
    const filteredInstances = useMemo(() => {
        const instances = data?.trackedEntities?.trackedEntityInstances || [];
        if (appliedSearchType === 'orgUnit' && appliedSearch.trim()) {
            return instances.filter(tei => 
                (tei.enrollments?.[0]?.orgUnitName || '').toLowerCase().includes(appliedSearch.toLowerCase())
            );
        }
        return instances;
    }, [data?.trackedEntities?.trackedEntityInstances, appliedSearch, appliedSearchType]);

    // ALL HOOKS ABOVE THIS LINE - NOW SAFE TO HAVE CONDITIONAL RETURNS

    // Handle page size change - following TableTesting.tsx pattern
    const handlePageSizeChange = useCallback((value: string) => {
        const newPageSize = parseInt(value ?? '50', 10);
        setPageSize(newPageSize);
        setPage(1); // Reset to first page when changing page size
    }, []);

    // Handle search - following TableTesting.tsx pattern
    const handleSearch = useCallback(() => {
        setAppliedSearch(searchTerm);
        setAppliedSearchType(searchType);
        setPage(1); // Reset to first page when searching
    }, [searchTerm, searchType]);

    // Handle clear search - following TableTesting.tsx pattern
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setAppliedSearch('');
        setAppliedSearchType('all');
        setSearchType('all');
        setPage(1);
    }, []);

    // Handle Enter key press in search input - following TableTesting.tsx pattern
    const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    // Server-side sorting handler - following TableTesting.tsx pattern
    const handleSortClick = useCallback(({ name, direction }: { name?: string; direction: SortDirection }) => {
        console.log('Sort clicked:', name, direction);
        const newDirection = direction === 'default' ? 'asc' : direction;
        setSort({ column: name as SortableField, direction: newDirection });
        setPage(1); // Reset to first page when sorting
    }, []);

    // Handle page navigation - following TableTesting.tsx pattern
    const handlePreviousPage = useCallback(() => {
        setPage((p) => Math.max(1, p - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        const totalPages = data?.trackedEntities?.pager?.pageCount || 1;
        setPage((p) => Math.min(totalPages, p + 1));
    }, [data?.trackedEntities?.pager?.pageCount]);

    // Early returns for loading and error states
    if (loading) return (
        <div className="layout">
            <Sidebar selectedEntity={selectedEntity} />
            <div className="content">
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <CircularLoader />
                    <p>Loading patient records...</p>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div className="layout">
            <Sidebar selectedEntity={selectedEntity} />
            <div className="content">
                <div style={{ color: 'red', padding: '20px' }}>
                    <h3>Error loading data</h3>
                    <p>{error.message}</p>
                    <button onClick={() => refetch()} style={{ 
                        padding: '10px 20px', 
                        marginTop: '10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}>
                        Retry
                    </button>
                </div>
            </div>
        </div>
    );

    const pager = data?.trackedEntities?.pager;
    const totalPages = pager?.pageCount || 1;
    const currentPage = page;

    // Map state to DHIS2 UI's expected sortDirection values
    const getSortDirection = (column: SortableField): SortDirection => {
        return sort.column === column ? sort.direction : 'default';
    };

    const rows = filteredInstances.map((instance) => {
        const getAttribute = (code: string) => getAttr(instance, code);

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
                <div className="header-section" style={{ marginBottom: '20px' }}>
                    <h2 style={{ marginBottom: '16px', color: '#333' }}>Patient Records</h2>
                    
                    {/* Search Section - following TableTesting.tsx pattern */}
                    <div className="search-section" style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '16px', 
                        borderRadius: '8px', 
                        marginBottom: '16px' 
                    }}>
                        <div className="search-controls" style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            alignItems: 'flex-end',
                            flexWrap: 'wrap'
                        }}>
                            <div className="search-type-selector" style={{ minWidth: '150px' }}>
                                <SingleSelectField
                                    label="Search by"
                                    selected={searchType}
                                    onChange={({ selected }) => setSearchType(selected ?? 'all')}
                                >
                                    {searchTypeOptions.map((option) => (
                                        <SingleSelectOption
                                            key={option.value}
                                            value={option.value}
                                            label={option.label}
                                        />
                                    ))}
                                </SingleSelectField>
                            </div>
                            <div className="search-input" style={{ flex: 1, minWidth: '200px' }} onKeyDown={handleKeyPress}>
                                <InputField
                                    label="Search term"
                                    value={searchTerm}
                                    onChange={({ value }) => setSearchTerm(value ?? "")}
                                    placeholder="Enter search term..."
                                />
                            </div>
                            <div className="search-buttons" style={{ display: 'flex', gap: '8px' }}>
                                <Button primary onClick={handleSearch}>
                                    Search
                                </Button>
                                <Button secondary onClick={handleClearSearch}>
                                    Clear
                                </Button>
                            </div>
                        </div>
                        {appliedSearch && (
                            <div className="search-status" style={{ marginTop: '12px' }}>
                                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                                    Searching for "{appliedSearch}" in{" "}
                                    {searchTypeOptions.find(opt => opt.value === appliedSearchType)?.label}{" "}
                                    ({pager?.total || 0} results found)
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="header-controls" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '16px'
                    }}>
                        <p style={{ margin: 0, color: '#666' }}>
                            Total: {pager?.total || 0} | Page {currentPage} of {totalPages}
                        </p>
                        <div className="page-size-selector" style={{ minWidth: '150px' }}>
                            <SingleSelectField
                                label="Items per page"
                                selected={pageSize.toString()}
                                onChange={({ selected }) => handlePageSizeChange(selected ?? '50')}
                            >
                                {pageSizeOptions.map((option) => (
                                    <SingleSelectOption
                                        key={option.value}
                                        value={option.value}
                                        label={option.label}
                                    />
                                ))}
                            </SingleSelectField>
                        </div>
                    </div>
                </div>
                
                {filteredInstances.length === 0 && !loading ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px',
                        color: '#666',
                        fontSize: '16px'
                    }}>
                        {appliedSearch ? (
                            <>
                                <p>No patients found matching "{appliedSearch}"</p>
                                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                                    Try different search terms or check spelling
                                </p>
                            </>
                        ) : (
                            <p>No patient records available</p>
                        )}
                    </div>
                ) : (
                    <>
                        <div style={{ 
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <DataTable className="table-fixed-header">
                                <DataTableHead>
                                    <DataTableRow>
                                        {columns.map((col) => (
                                            <DataTableColumnHeader
                                                key={col.id}
                                                name={col.field}
                                                sortDirection={getSortDirection(col.field as SortableField)}
                                                onSortIconClick={handleSortClick}
                                            >
                                                {col.label}
                                            </DataTableColumnHeader>
                                        ))}
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>{rows}</DataTableBody>
                            </DataTable>
                        </div>

                        {/* Pagination - following TableTesting.tsx pattern */}
                        <div className="pagination-info" style={{ 
                            marginTop: '20px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px'
                        }}>
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage <= 1}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: currentPage <= 1 ? '#e9ecef' : '#007bff',
                                    color: currentPage <= 1 ? '#6c757d' : 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Previous
                            </button>
                            <span style={{ fontWeight: '500' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= totalPages}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#007bff',
                                    color: currentPage >= totalPages ? '#6c757d' : 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Next
                            </button>
                        </div>

                        {pager && (
                            <div style={{ 
                                marginTop: '16px', 
                                color: '#666', 
                                fontSize: '14px',
                                textAlign: 'center',
                                padding: '8px 16px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px'
                            }}>
                                {appliedSearch ? (
                                    <>Found {pager.total} results for "{appliedSearch}" (showing page {page} of {pager.pageCount})</>
                                ) : (
                                    <>
                                        Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, pager.total)} of {pager.total} total records
                                        {sort.direction !== 'default' && (
                                            <> • Sorted by {sort.column} ({sort.direction})</>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}