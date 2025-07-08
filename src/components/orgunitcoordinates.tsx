import React, { useEffect , useRef} from 'react';
import { useDataQuery } from '@dhis2/app-runtime';

interface OrgUnitGeometry {
    type: string;
    coordinates: [number, number];
}

interface OrgUnitData {
    id: string;
    name: string;
    geometry: OrgUnitGeometry;
}

const query = {
    organisationUnit: {
        resource: 'organisationUnits',
        id: ({ orgUnitId }: { orgUnitId: string }) => orgUnitId, // Ensure correct ID is used
        params: {
            fields: 'id,name,geometry',
        },
    },
};

// Add onCoordinatesFetched as a prop
const FetchOrgUnitData = ({
    orgUnitId,
    onCoordinatesFetched,
}: {
    orgUnitId: string;
    onCoordinatesFetched: (coordinates: [number, number]) => void;
}) => {
    const { data, error } = useDataQuery(query, {
        variables: { orgUnitId }
    });

    // To prevent calling onCoordinatesFetched multiple times
    const fetched = useRef(false);

    useEffect(() => {
        if (error) {
            console.error('Error fetching org unit data:', error);
        } else if (data && !fetched.current) {
            console.log('Org Unit Data:', data.organisationUnit);
            if (data.organisationUnit.geometry?.coordinates) {
                onCoordinatesFetched(data.organisationUnit.geometry.coordinates);
                fetched.current = true;
            }
        }
    }, [data, error, onCoordinatesFetched]);
    return (
        <div>
            {error && <p>Error: {error.message}</p>}
        </div>
    );
};

export default FetchOrgUnitData;
