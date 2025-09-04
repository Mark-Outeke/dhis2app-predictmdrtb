import React, { useState, useMemo, useEffect } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import {
    DataTable, DataTableHead, DataTableBody,
    DataTableRow, DataTableCell, DataTableColumnHeader,
    CircularLoader, SingleSelectField, SingleSelectOption,
    InputField, Button
} from '@dhis2/ui';
import './TableTesting.css';
import Sidebar from './SideBar';

// ---- Helpers ----
type Attribute = { attribute: string; value: string };
type Enrollment = { orgUnitName: string; orgUnit: string };
type TrackedEntityInstance = {
    trackedEntityInstance: string;
    created: string;
    orgUnitName: string;
    attributes: Attribute[];
    enrollments: Enrollment[];
};
type QueryResult = {
    trackedEntities: {
        trackedEntityInstances: TrackedEntityInstance[];
        pager: { page: number; pageSize: number; pageCount: number; total: number };
    };
};

const query = {
    trackedEntities: {
        resource: 'trackedEntityInstances',
        params: ({ ou, program, page, pageSize, order, filter }: any) => ({
            ou,
            ouMode: 'DESCENDANTS',
            program,
            fields: [
                'trackedEntityInstance', 'orgUnitName', 'created',
                'attributes[attribute,value]', 'enrollments[orgUnit,orgUnitName]'
            ].join(','),
            page, pageSize, order, totalPages: true, paging: true,
            ...(filter ? { filter } : {})
        }),
    },
};

const getAttr = (tei: TrackedEntityInstance, id: string) =>
    tei.attributes?.find(a => a.attribute === id)?.value ?? 'N/A';

// Define columns once
const columns = [
    { id: 'created', label: 'Created Date', render: (tei: TrackedEntityInstance) => new Date(tei.created).toLocaleDateString() },
    { id: 'orgUnitName', label: 'Org Unit', render: (tei: TrackedEntityInstance) => tei.enrollments?.[0]?.orgUnitName || 'N/A' },
    { id: 'ZkNZOxS24k7', label: 'TB Number', render: (tei: TrackedEntityInstance) => getAttr(tei, 'ZkNZOxS24k7') },
    { id: 'ENRjVGxVL6l', label: 'Last Name', render: (tei: TrackedEntityInstance) => getAttr(tei, 'ENRjVGxVL6l') },
    { id: 'sB1IHYu2xQT', label: 'First Name', render: (tei: TrackedEntityInstance) => getAttr(tei, 'sB1IHYu2xQT') },
    { id: 'jWjSY7cktaQ', label: 'Patient Name', render: (tei: TrackedEntityInstance) => getAttr(tei, 'jWjSY7cktaQ') },
    { id: 'Ewi7FUfcHAD', label: 'National ID', render: (tei: TrackedEntityInstance) => getAttr(tei, 'Ewi7FUfcHAD') },
    { id: 'Gy1jHsTp9P6', label: 'Age', render: (tei: TrackedEntityInstance) => getAttr(tei, 'Gy1jHsTp9P6') },
    { id: 'GnL13HAVFOm', label: 'Sex', render: (tei: TrackedEntityInstance) => getAttr(tei, 'GnL13HAVFOm') },
];

// Page size options
const pageSizeOptions = [
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' },
];

// Search type options
const searchTypeOptions = [
    { value: 'all', label: 'All Fields' },
    { value: 'jWjSY7cktaQ', label: 'Patient Name' },
    { value: 'ZkNZOxS24k7', label: 'TB Number' },
    { value: 'orgUnit', label: 'Org Unit Name' },
    { value: 'ENRjVGxVL6l', label: 'Last Name' },
    { value: 'sB1IHYu2xQT', label: 'First Name' },
    { value: 'Ewi7FUfcHAD', label: 'National ID' },
];

// ---- Component ----
export default function TableTesting() {
    // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL HOOKS
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [sort, setSort] = useState({ column: 'created', direction: 'desc' as 'asc' | 'desc' | 'default' });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [appliedSearchType, setAppliedSearchType] = useState('all');

    const order = useMemo(() => `${sort.column}:${sort.direction}`, [sort]);

    // Build filter string based on search type and term
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
            // For org unit, we'll need to handle this differently as it's not an attribute
            // This might need to be handled client-side or with a different API approach
            return '';
        } else {
            // Search specific attribute
            return `${appliedSearchType}:LIKE:${searchValue}`;
        }
    }, [appliedSearch, appliedSearchType]);

    const { loading, error, data, refetch } = useDataQuery<QueryResult>(query, {
        variables: { ou: 'akV6429SUqu', program: 'wfd9K4dQVDR', page, pageSize, order, filter },
    });

    // Refetch whenever page, pageSize, order, or filter changes
    useEffect(() => {
        refetch({ ou: 'akV6429SUqu', program: 'wfd9K4dQVDR', page, pageSize, order, filter });
    }, [page, pageSize, order, filter, refetch]);

    // Client-side filtering for org unit if needed
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

    // Handle page size change
    const handlePageSizeChange = (value: string) => {
        const newPageSize = parseInt(value ?? '50', 10);
        setPageSize(newPageSize);
        setPage(1); // Reset to first page when changing page size
    };

    // Handle search
    const handleSearch = () => {
        setAppliedSearch(searchTerm);
        setAppliedSearchType(searchType);
        setPage(1); // Reset to first page when searching
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchTerm('');
        setAppliedSearch('');
        setAppliedSearchType('all');
        setSearchType('all');
        setPage(1);
    };

    // Handle Enter key press in search input
    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    if (loading) return <CircularLoader />;
    if (error) return <p style={{ color: 'red' }}>Error: {error.message}</p>;

    const { pager } = data?.trackedEntities ?? {};
    const totalPages = pager?.pageCount || 1;
    const currentPage = page;

    return (
      <div className="table-testing-container">
        <Sidebar selectedEntity={null} />
        <div className="main-content">
          <div className="header">
            <h2>Simple Table Testing</h2>

            {/* Search Section */}
            <div className="search-section">
              <div className="search-controls">
                <div className="search-type-selector">
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
                <div className="search-input" onKeyDown={handleKeyPress}>
                  <InputField
                    label="Search term"
                    value={searchTerm}
                    onChange={({ value }) => setSearchTerm(value ?? "")}
                    placeholder="Enter search term..."
                  />
                </div>
                <div className="search-buttons">
                  <Button primary onClick={handleSearch}>
                    Search
                  </Button>
                  <Button secondary onClick={handleClearSearch}>
                    Clear
                  </Button>
                </div>
              </div>
              {appliedSearch && (
                <div className="search-status">
                  <p>
                    Searching for "{appliedSearch}" in{" "}
                    {
                      searchTypeOptions.find(
                        (opt) => opt.value === appliedSearchType
                      )?.label
                    }{" "}
                    ({pager?.total || 0} results found)
                  </p>
                </div>
              )}
            </div>

            <div className="header-controls">
              <p>
                Total: {pager?.total || 0} | Page {currentPage} of {totalPages}
              </p>
            </div>
          </div>

          <DataTable>
            <DataTableHead>
              <DataTableRow>
                {columns.map((col) => (
                  <DataTableColumnHeader
                    key={col.id}
                    name={col.id}
                    sortDirection={
                      sort.column === col.id ? sort.direction : "default"
                    }
                    onSortIconClick={({ name, direction }) =>
                      setSort({
                        column: name || "",
                        direction: direction === "default" ? "asc" : direction,
                      })
                    }
                  >
                    {col.label}
                  </DataTableColumnHeader>
                ))}
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {filteredInstances.map((tei) => (
                <DataTableRow key={tei.trackedEntityInstance}>
                  {columns.map((col) => (
                    <DataTableCell key={col.id}>
                      {col.render(tei)}
                    </DataTableCell>
                  ))}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>

          <div className="pagination-info">
            <div className="page-size-selector">
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
}
