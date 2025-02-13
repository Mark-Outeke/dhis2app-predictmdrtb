import React ,{useState, useRef, useEffect} from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useDataQuery } from '@dhis2/app-runtime';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableColumnHeader, CircularLoader, Button } from '@dhis2/ui'; // Import necessary UI components
//import './TrackedEntityDetails.css'; // Make sure to include any styles you may need.
import PredictionComponent from './PredictionProcessor';
import Sidebar from './SideBar';
import HotspotProcessor from './HotSpotData';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; 
import 'leaflet.heat' ;
//import 'leaflet.heat/dist/leaflet-heat.css';



import L from 'leaflet';

// Ensure the icon path is correctly set for Leaflet markers
//delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


interface RouteParams {
    trackerEntityId: string;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface Geometry {
    type: string;
    coordinates: [number, number];
}

interface OrgUnit {
    id: string;
    name: string;
    level: number;
    geometry: Geometry;
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

    const [heatmapData, setHeatmapData] = useState<[number, number, number][]>([]);
    //console.log("heatmapData: " ,heatmapData);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (heatmapData.length > 0 && mapRef.current) {
            L.heatLayer(heatmapData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {
                    0.2: 'blue',
                    0.4: 'lime',
                    0.6: 'yellow',
                    0.8: 'orange',
                    1.0: 'red',
                },
            }).addTo(mapRef.current);
        }
    }, [heatmapData]);

    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;

    const entity = data?.trackedEntities;
    console.log("entity: " ,entity);

    if (!entity) {
        return <p>No entity details available.</p>;
    }
    //extract orgunit from entity data found in enrollments
    const orgUnitId = entity.enrollments?.[0]?.orgUnit || 'N/A';
    console.log("orgUnitId: " ,orgUnitId);
    const orgUnitName = entity.enrollments?.[0]?.orgUnitName || 'N/A';
    
    // Extract org unit coordinates data
    const { data: orgUnitData } = useDataQuery({
        organizationUnits: {
            resource: "organisationUnits",
            id: orgUnitId,
            params: {
                fields: ["geometry"],
            },
        },
    }, { variables: { orgUnitId } });
    
    // Log the geometry if available
    useEffect(() => {
        if (orgUnitData) {
            console.log("Org Unit Geometry: ", orgUnitData.organizationUnit.geometry);
        }
    }, [orgUnitData]);
    
    // Usage of org unit coordinates
    const orgUnitCoordinates = orgUnitData?.organizationUnit?.geometry || { type: 'Point', coordinates: [0, 0] };
    console.log("Org Unit Coordinates: ", orgUnitCoordinates);
    // Extract coordinates from attributes
    const attributes = entity?.attributes || [];
    const gisCoordinatesAttr = attributes.find(attr => attr.displayName === "GIS Coordinates");
    const gisCoordinates = gisCoordinatesAttr ? JSON.parse(gisCoordinatesAttr.value) : [0, 0];

    const trackedEntityCoordinates = {
        latitude: gisCoordinates[0],
        longitude: gisCoordinates[1],
    };
    console.log("trackedEntityCoordinates: ", trackedEntityCoordinates);

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

                {/* Render PredictionComponent with trackedEntityId */}
            <PredictionComponent trackedEntityId={trackerEntityId} />    
            
              {/* Render HotspotProcessor */}
            <HotspotProcessor setHeatmapData={setHeatmapData} />

                {/* Render Map */}
            <MapContainer center={[orgUnitCoordinates.latitude, orgUnitCoordinates.longitude]} 
                                zoom={13} 
                                style={{ height: '800px', width: '75%', marginBottom: '20px' }}
                                attributionControl={true} 
                                whenCreated = {mapInstance => {mapRef.current = mapInstance}}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            
                        />
                        {/* Render Org Unit Marker */}
                        <Marker position={[orgUnitCoordinates.latitude, orgUnitCoordinates.longitude]}>
                            <Popup>
                                Organization Unit: {orgUnitName}
                            </Popup>
                        </Marker>
                        {/* Render Tracked Entity Marker */}
                        <Marker 
                            position={[trackedEntityCoordinates.latitude, trackedEntityCoordinates.longitude]} 
                            icon={new L.Icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png'
                            })}
                        >
                            <Popup>
                                Tracked Entity: {trackerEntityId}
                            </Popup>
                        </Marker>

                        {/* Render Heatmap Data */}
                        <GeoJSON data={{
                            type: 'FeatureCollection',
                            features: heatmapData.map(([lat, lng]) => ({
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: [lng, lat],
                                },
                                properties: {},
                            })),
                        }} />
                    </MapContainer>

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
