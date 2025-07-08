import React, { useState, useRef, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useDataQuery } from '@dhis2/app-runtime';
//import { useQuery } from 'react-query';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableColumnHeader, CircularLoader, Button } from '@dhis2/ui';
import PredictionComponent from './PredictionProcessor';
import Sidebar from './SideBar';
import HotspotProcessor from './HotSpotData';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import {useOrgUnitGeometry } from './useOrgUnitGeometry';
import L from 'leaflet';
import  FetchOrgUnitData  from './orgunitcoordinates';

// Ensure the icon path is correctly set for Leaflet markers
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface RouteParams {
    trackerEntityId: string;
    orgUnitId: string;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}
interface DataElementMetadata {
    id: string;
    displayName: string;
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
    dataElements: {
        resource: "dataElements",
        params: {
            fields: ["id", "displayName"],
             paging: "false",
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

// Extract Org Unit ID from the first query
const orgUnitId = data?.trackedEntities?.enrollments?.[0]?.orgUnit || null;

    const [entity, setEntity] = useState<any | null>(null);
    const [orgUnitCoordinates, setOrgUnitCoordinates] = useState<Coordinates>({ latitude: 0, longitude: 0 });
    const [trackedEntityCoordinates, setTrackedEntityCoordinates] = useState<Coordinates>({ latitude: 0, longitude: 0 });
    const [orgUnitName, setOrgUnitName] = useState<string>('N/A');
    const [events, setEvents] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<[number, number, number][]>([]);
    const [distance, setDistance] = useState<number | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const [dataElementsMetadata, setDataElementsMetadata] = useState<DataElementMetadata[]>([]);

    

    useEffect(() => {
        if (data?.trackedEntities) {
            const entityData = data.trackedEntities;
            setEntity(entityData);
            console.log("Entity data:", entityData);

            // Extract org unit data
            const orgUnitId = entityData.enrollments?.[0]?.orgUnit;
            console.log("orgUnitId:", orgUnitId);
            const orgUnitName = entityData.enrollments?.[0]?.orgUnitName || 'N/A';
            setOrgUnitName(orgUnitName);

            // Extract coordinates from attributes
            const attributes = entityData.attributes || [];
            const gisCoordinatesAttr = attributes.find(attr => attr.displayName === "GIS Coordinates");
            const gisCoordinates = gisCoordinatesAttr ? JSON.parse(gisCoordinatesAttr.value.replace(/'/g, '"')) : [0, 0];
            console.log("GIS Coordinates: ", gisCoordinates);
            setTrackedEntityCoordinates({
                latitude: gisCoordinates[0],
                longitude: gisCoordinates[1],
            });
            //console.log("trackedEntityCoordinates: ", trackedEntityCoordinates);

            // Extract events and their data elements
            const eventsData = entityData.enrollments?.[0]?.events || [];
            setEvents(eventsData);
        }
    }, [data]);

    
    useEffect(() => {
        if (data?.dataElements?.dataElements) {
            const metadata = data.dataElements.dataElements;
            setDataElementsMetadata(metadata);
            console.log("Data Elements Metadata:", metadata);
        }
    }, [data]);

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

    useEffect(() => {
        if (
            orgUnitCoordinates.latitude !== 0 &&
            orgUnitCoordinates.longitude !== 0 &&
            trackedEntityCoordinates.latitude !== 0 &&
            trackedEntityCoordinates.longitude !== 0
        ) {
            // Correct the swapped coordinates input used in the calculation
            const correctedOrgUnitCoordinates: Coordinates = {
                latitude: orgUnitCoordinates.longitude, // Swap
                longitude: orgUnitCoordinates.latitude, // Swap
            };
    
            const correctedTrackedEntityCoordinates: Coordinates = {
                latitude: trackedEntityCoordinates.longitude, // Swap
                longitude: trackedEntityCoordinates.latitude, // Swap
            };
    
            // Calculate distance with the assumed swap correction
            const dist = calculateDistance(correctedOrgUnitCoordinates, correctedTrackedEntityCoordinates);
            setDistance(dist);
        }
    }, [orgUnitCoordinates, trackedEntityCoordinates]);
    

    const handlePredictionsClick = () => {
        history.push(`/Predictions`, { trackedEntity: entity }); // Pass the entity data
    };

    const handleCoordinatesFetched = (coordinates: [number, number]) => {
        setOrgUnitCoordinates({
            latitude: coordinates[1],
            longitude: coordinates[0],
        });
    };

    if (loading) return <CircularLoader />;
    if (error) return <p>Error: {error.message}</p>;
    
    if (!entity) return <p>loading entity data....</p>
    

    // Haversine formula to calculate the distance
    const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371; // Radius of the Earth in km
        const dLat = toRad(coord2.latitude - coord1.latitude);
        const dLon = toRad(coord2.longitude - coord1.longitude);
        const lat1 = toRad(coord1.latitude);
        const lat2 = toRad(coord2.latitude);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    };

// Function to match dataElement IDs with displayNames
    const getDataElementDisplayName = (dataElementId: string): string => {
        const metadata = dataElementsMetadata.find(de => de.id === dataElementId);
        return metadata ? metadata.displayName : 'Unknown Data Element';
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

                    {/* render fectorgunit data*/}
                    <FetchOrgUnitData orgUnitId={orgUnitId} onCoordinatesFetched={(coordinates) => setOrgUnitCoordinates({
                            latitude: coordinates[1], // Ensure the correct order of lat/lng
                            longitude: coordinates[0],
                        })} />
                    {/* Render Map */}
    <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title text-center">Map Showing the Patient's Location and Proximity to Hotspots</h5>
                    <MapContainer center={[trackedEntityCoordinates.longitude, trackedEntityCoordinates.latitude]} 
                                  zoom={13} 
                                  style={{ height: '800px', width: '75%', marginBottom: '20px' }}
                                  attributionControl={true} 
                                  whenCreated={mapInstance => { mapRef.current = mapInstance }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {/* Render Org Unit Marker */}
                        <Marker position={[orgUnitCoordinates.latitude, orgUnitCoordinates.longitude]}>
                            <Popup>Organization Unit: {orgUnitName}</Popup>
                        </Marker>
                        {/* Render Tracked Entity Marker */}
                        <Marker position={[trackedEntityCoordinates.longitude, trackedEntityCoordinates.latitude]} 
                                icon={new L.Icon({
                                    iconUrl: process.env.PUBLIC_URL + '/patient.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
                                    iconSize: [38, 38], 
                                    shadowSize: [50, 64], 
                                    iconAnchor: [22, 94], 
                                    shadowAnchor: [4, 62], 
                                    popupAnchor: [0, -86], 
                                })}>
                            <Popup>Tracked Entity: {trackerEntityId}</Popup>
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
                    </div>
                    </div>
                    </div>
                    </div>
                        {/* Render the distance below the map */}
                        {distance !== null && (

                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <div className="card">
                                                            <div className="card-body">
                                                                <p><strong>Distance from Organization Unit:</strong> {distance.toFixed(2)} km</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                    {/* Button to navigate to the predictions page */}
                    <Button onClick={handlePredictionsClick} primary>View Predictions</Button>

                    <h3>Data Elements and Values</h3>

                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>Data Element</DataTableColumnHeader>
                                <DataTableColumnHeader>Value</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                           {events.length > 0 && events[0].dataValues.map((dataValue, index) => (
                                <DataTableRow key={index}>
                                    <DataTableCell>{getDataElementDisplayName(dataValue.dataElement)}</DataTableCell>
                                    <DataTableCell>{dataValue.value}</DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                    </DataTable>
                </div>
            </div>
        </div>
    );
};

export default TrackedEntityDetails;
