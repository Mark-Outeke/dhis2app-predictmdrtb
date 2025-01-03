import React from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useDataQuery } from '@dhis2/app-runtime';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableColumnHeader, CircularLoader, Button } from '@dhis2/ui'; // Import necessary UI components
//import './TrackedEntityDetails.css'; // Make sure to include any styles you may need.
import PredictionComponent from './PredictionProcessor';
import Sidebar from './SideBar';

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
    const history = useHistory();
    const { loading, error, data } = useDataQuery(QUERY, {
        variables: {
            trackerEntityId: trackerEntityId,
        },
    });

    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;

    const entity = data?.trackedEntities;
    console.log("entity: " ,entity);

    if (!entity) {
        return <p>No entity details available.</p>;
    }

    const orgUnitName = entity.enrollments?.[0]?.orgUnitName || 'N/A';

    // Extract events and their data elements
    const events = entity.enrollments?.[0]?.events || [];


    const handlePredictionsClick = () => {
        history.push(`/Predictions`, { trackedEntity: entity }); // Pass the entity data
    };


    return (
        <div>
            <div className="layout"> {/* Add layout styling */}
            <Sidebar />
            <div className="content"> {/* Content area for the table */}
                <h2>Patient's Dashboard</h2>
                <h3>Essential Information</h3>
            
            <p><strong>Organization Unit:</strong> {orgUnitName}</p>
            <p><strong>Registration Date:</strong> {new Date(entity.created).toLocaleDateString()}</p>
            
            
            {/* Render Attributes in a flexible card layout */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                {entity.attributes.map(attr => (
                    <div key={attr.attribute} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', flex: '1 1 calc(33% - 20px)', boxSizing: 'border-box' }}>
                        <strong>{attr.displayName}:</strong> {attr.value}
                    </div>
                ))}
            </div>

            {/* Button to navigate to the predictions page */}
            <Button onClick={handlePredictionsClick} primary>
                        View Predictions
                    </Button>

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
        </div>
        </div>
    );
};

export default TrackedEntityDetails;
