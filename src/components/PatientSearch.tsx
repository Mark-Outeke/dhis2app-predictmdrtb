import React, { useState, useEffect, useRef } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import { Input, CircularLoader } from '@dhis2/ui';
import './PatientSearch.css';

// Use the same interfaces as TrackerDataTable
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

interface SearchResult {
    trackedEntityInstance: string;
    displayName: string;
    tbNumber: string;
    nationalId: string;
    orgUnitName: string;
    created: string;
}

interface PatientSearchProps {
    onPatientSelect: (patientId: string, patient: SearchResult) => void;
    placeholder?: string;
}

// Create search query function like in TrackerDataTable
const createSearchQuery = (searchTerm: string = '') => {
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
        pageSize: 20, // Limit results for performance
        totalPages: false,
    };

    // Add search filters if search term exists
    if (searchTerm && searchTerm.trim()) {
        // Search across multiple attributes using DHIS2 API filters
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

const PatientSearch: React.FC<PatientSearchProps> = ({ 
    onPatientSelect, 
    placeholder = "Search patients by name, TB number, or National ID..." 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);
    

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Create dynamic query based on search term - exactly like TrackerDataTable
    const query = createSearchQuery(debouncedSearchTerm);
    
    // Use the dynamic query - exactly like TrackerDataTable
    const { loading, error, data } = useDataQuery<QueryResult>(
        query,
        { 
            lazy: debouncedSearchTerm.length < 2
        }
    );

    // Process search results - exactly like TrackerDataTable
    const searchResults: SearchResult[] = React.useMemo(() => {
        if (!data?.trackedEntities?.trackedEntityInstances) return [];

        const instances = data.trackedEntities.trackedEntityInstances;

        return instances.map((instance) => {
            const getAttribute = (code: string) =>
                instance.attributes.find((attr) => attr.attribute === code)?.value || '';

            const firstName = getAttribute('sB1IHYu2xQT');
            const lastName = getAttribute('ENRjVGxVL6l');
            const patientName = getAttribute('jWjSY7cktaQ');
            
            // Construct display name
            const displayName = patientName || `${firstName} ${lastName}`.trim() || 'Unknown Patient';

            return {
                trackedEntityInstance: instance.trackedEntityInstance,
                displayName,
                tbNumber: getAttribute('ZkNZOxS24k7'),
                nationalId: getAttribute('Ewi7FUfcHAD'),
                orgUnitName: instance.enrollments?.[0]?.orgUnitName || 'N/A',
                created: instance.created
            };
        });
    }, [data]);

    // Open dropdown when we have results
    useEffect(() => {
        setIsOpen(debouncedSearchTerm.length >= 2 && searchResults.length > 0);
    }, [debouncedSearchTerm, searchResults]);

    // Handle keyboard navigation
    const handleKeyDown = (payload: any, event: React.KeyboardEvent) => {
        if (!isOpen || searchResults.length === 0) return;

        switch (event.key) {  // Use event.key instead of payload.key
            case 'ArrowDown':
                event.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, -1));
                break;
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0) {
                    handleSelectPatient(searchResults[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSelectPatient = (patient: SearchResult) => {
        setSearchTerm(patient.displayName);
        setIsOpen(false);
        setSelectedIndex(-1);
        onPatientSelect(patient.trackedEntityInstance, patient);
    };

     const handleSearchChange = (payload: { value?: string }) => {
        const value = payload.value || '';
        setSearchTerm(value);
        setSelectedIndex(-1);
        if (value.length < 2) {
            setIsOpen(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="patient-search" ref={searchRef}>
            <div className="patient-search__input-wrapper">
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (searchResults.length > 0 && debouncedSearchTerm.length >= 2) {
                            setIsOpen(true);
                        }
                    }}
                />
                {loading && <CircularLoader small />}
            </div>

            {isOpen && (
                <div className="patient-search__dropdown">
                    {searchResults.length > 0 ? (
                        <div className="patient-search__results">
                            {searchResults.map((patient, index) => (
                                <div
                                    key={patient.trackedEntityInstance}
                                    className={`patient-search__result-item ${
                                        index === selectedIndex ? 'patient-search__result-item--selected' : ''
                                    }`}
                                    onClick={() => handleSelectPatient(patient)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="patient-search__result-main">
                                        <strong>{patient.displayName}</strong>
                                        {patient.tbNumber && (
                                            <span className="patient-search__result-tb">TB: {patient.tbNumber}</span>
                                        )}
                                    </div>
                                    <div className="patient-search__result-details">
                                        <span>{patient.orgUnitName}</span>
                                        {patient.nationalId && (
                                            <span className="patient-search__result-id">ID: {patient.nationalId}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : debouncedSearchTerm.length >= 2 && !loading && (
                        <div className="patient-search__no-results">
                            No patients found for "{debouncedSearchTerm}"
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="patient-search__error">
                    Error searching patients: {error.message}
                </div>
            )}
        </div>
    );
};

export default PatientSearch;