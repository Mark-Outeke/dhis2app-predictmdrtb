import React from 'react';
import { useParams } from 'react-router-dom';
import { useDataQuery } from '@dhis2/app-runtime';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableColumnHeader, CircularLoader } from '@dhis2/ui'; // Import necessary UI components
//import './TrackedEntityDetails.css'; // Make sure to include any styles you may need.

interface RouteParams {
    trackerEntityId: string;
}

const QUERY = {
    trackedEntities: {
        resource: "trackedEntityInstances",
        id: ({ trackerEntityId }: { trackerEntityId: string }) => trackerEntityId,
        params: {
            fields: [
                "trackedEntityInstance",
                "enrollments",
                "created",
                "attributes",
                "orgUnitName",
                "events",
                "coordinates",
            ],
        },
    },
};

const TrackedEntityDetails = () => {
    const { trackerEntityId } = useParams<RouteParams>();
    const { loading, error, data } = useDataQuery(QUERY, {
        variables: {
            trackerEntityId: trackerEntityId,
        },
    });

    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;

    const entity = data?.trackedEntities;

    if (!entity) {
        return <p>No entity details available.</p>;
    }

    const orgUnitName = entity.enrollments?.[0]?.orgUnitName || 'N/A';

    // Extract events and their data elements
    const events = entity.enrollments?.[0]?.events || [];

    return (
        <div>
            <h2>Patient's Dashboard</h2>
            <p><strong>Organization Unit:</strong> {orgUnitName}</p>
            <p><strong>Registration Date:</strong> {new Date(entity.created).toLocaleDateString()}</p>
            
            <h3>Attributes</h3>
            {/* Render Attributes in a flexible card layout */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                {entity.attributes.map(attr => (
                    <div key={attr.attribute} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', flex: '1 1 calc(33% - 20px)', boxSizing: 'border-box' }}>
                        <strong>{attr.name}:</strong> {attr.value}
                    </div>
                ))}
            </div>

            <h3>Data Elements and Values</h3>
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>Data Element</DataTableColumnHeader>
                        <DataTableColumnHeader>Value</DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {events.map(event => (
                        event.dataValues.map((dataValue, index) => (
                            <DataTableRow key={index}>
                                <DataTableCell>{dataValue.dataElement}</DataTableCell>
                                <DataTableCell>{dataValue.value}</DataTableCell>
                            </DataTableRow>
                        ))
                    ))}
                </DataTableBody>
            </DataTable>
        </div>
    );
};

export default TrackedEntityDetails;
