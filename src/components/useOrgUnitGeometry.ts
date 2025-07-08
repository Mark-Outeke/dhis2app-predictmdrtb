import { useEffect, useMemo } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';

interface OrgUnitGeometry {
    name: string; 
    geometry?: {
        type: 'Point';
        coordinates: [number, number]; 
    };
    id: string; 
}
interface OrgUnit {
    id: string;
    name: string;
    geometry?: OrgUnitGeometry;
}

const query = {
    organisationUnit: {
        resource: 'organisationUnits',
        id: ({ orgUnitId }: { orgUnitId: string }) => orgUnitId, // Ensure correct ID is used
        params: {
            fields: ["id","name","geometry"],
        },
    },
};

export const useOrgUnitGeometry = (orgUnitId: string) => {
  console.log('Received orgUnitId in useOrgUnitGeometry:', orgUnitId);  
    const { data, error } = useDataQuery(query,
        { variables: { orgUnitId } } 
         // Ensures it doesn't suspend the component while loading
    );
    

    useEffect(() => {
        if (data) {
            //console.log("Fetched Org Unit Data useOrg: ", data);
        }
        if (error) {
            console.error("Error fetching org unit geometry:", error);
        }
    }, [data, error]);

    // Ensure we return only the required geometry object
    const orgUnitGeometry: OrgUnitGeometry | null = useMemo(() => {
        return data?.organisationUnit?.geometry || null;
    }, [data]);

    return orgUnitGeometry;
};
