import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDataQuery } from '@dhis2/app-runtime';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import L from 'leaflet';
import FetchOrgUnitData from './orgunitcoordinates';
import Sidebar from './SideBar';

// Ensure the icon path is correctly set for Leaflet markers
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Interface definitions
interface RouteParams {
    trackerEntityId: string;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface DataElementMetadata {
    id: string;
    displayName: string;
    name?: string;
}

interface DataElement {
    id: string;
    name: string;
    displayName: string;
}

interface TrackedEntity {
    trackedEntityInstance: string;
    enrollments: Array<{
        orgUnit: string;
        orgUnitName?: string;
        program: string;
        events: Array<{
            dataValues: Array<{
                dataElement: string;
                value: string;
            }>;
        }>;
    }>;
    attributes: Array<{
        attribute: string;
        value: string;
        displayName?: string;
    }>;
    coordinates?: string;
    orgUnitName?: string;
}

interface APIResponse {
    trackedEntities?: TrackedEntity;
    dataElements?: {
        dataElements: DataElement[];
    };
}

const MapComponent = () => {
    const { trackerEntityId } = useParams<RouteParams>();
    
    // State management
    const [entity, setEntity] = useState<TrackedEntity | null>(null);
    const [dataElementsMetadata, setDataElementsMetadata] = useState<DataElementMetadata[]>([]);
    const [orgUnitCoordinates, setOrgUnitCoordinates] = useState<Coordinates>({ latitude: 0, longitude: 0 });
    const [trackedEntityCoordinates, setTrackedEntityCoordinates] = useState<Coordinates>({ latitude: 0, longitude: 0 });
    const [orgUnitName, setOrgUnitName] = useState<string>('N/A');
    const [heatmapData, setHeatmapData] = useState<[number, number, number][]>([]);
    const [coordinatesLoaded, setCoordinatesLoaded] = useState<boolean>(false);
    const [dataError, setDataError] = useState<string | null>(null);
    
    const mapRef = useRef<L.Map | null>(null);

    // DHIS2 API Query
    const QUERY = {
        trackedEntities: {
            resource: "trackedEntityInstances",
            id: ({ trackerEntityId }: any) => trackerEntityId,
            params: {
                fields: [
                    "trackedEntityInstance",
                    "enrollments[orgUnit,orgUnitName,program,events[dataValues[dataElement,value]]]",
                    "created",
                    "attributes[attribute,value,displayName]",
                    "orgUnitName",
                    "coordinates",
                ],
            },
        },
        dataElements: {
            resource: "dataElements",
            params: {
                fields: ["id", "name", "displayName"],
                paging: "false",
            },
        },
    };

    const { loading, error, data } = useDataQuery(QUERY, {
        variables: { trackerEntityId: trackerEntityId },
    });

    // Process tracked entity data
    useEffect(() => {
        if (data) {
            const apiData = data as APIResponse;
            const entityData = apiData?.trackedEntities;
            
            if (entityData) {
                setEntity(entityData);
                console.log("Entity data:", entityData);

                // Extract organization unit information
                const enrollment = entityData.enrollments?.[0];
                if (enrollment) {
                    const orgUnitId = enrollment.orgUnit;
                    const orgName = enrollment.orgUnitName || entityData.orgUnitName || 'N/A';
                    
                    console.log("orgUnitId:", orgUnitId);
                    setOrgUnitName(orgName);
                }

                // Extract and parse GIS coordinates
                const attributes = entityData.attributes || [];
                console.log("All attributes:", attributes);
                
                // Try different attribute patterns for coordinates
                let coordinatesFound = false;
                
                // Look for GIS Coordinates attribute
                const gisCoordinatesAttr = attributes.find((attr: any) => 
                    attr.displayName === "GIS Coordinates" || 
                    attr.displayName?.toLowerCase().includes("coordinates") ||
                    attr.displayName?.toLowerCase().includes("location")
                );
                
                if (gisCoordinatesAttr && gisCoordinatesAttr.value) {
                    coordinatesFound = parseCoordinates(gisCoordinatesAttr.value);
                }
                
                // Fallback: check entity-level coordinates
                if (!coordinatesFound && entityData.coordinates) {
                    coordinatesFound = parseCoordinates(entityData.coordinates);
                }
                
                // If no coordinates found, set error state
                if (!coordinatesFound) {
                    console.warn("No valid coordinates found for tracked entity");
                    setDataError("Patient location coordinates not available");
                    // Set default coordinates (you might want to use organization unit coordinates)
                    setTrackedEntityCoordinates({ latitude: -1.286389, longitude: 36.817223 }); // Nairobi default
                }
                
                setCoordinatesLoaded(true);
            } else {
                setDataError("No tracked entity data found");
            }
        }
    }, [data]);

    // Helper function to parse coordinates from various formats
    const parseCoordinates = (coordinateString: string): boolean => {
        try {
            console.log("Parsing coordinates:", coordinateString);
            
            // Handle different coordinate formats
            let coordinates;
            
            // Format 1: JSON array string like "[latitude, longitude]"
            if (coordinateString.startsWith('[') && coordinateString.endsWith(']')) {
                coordinates = JSON.parse(coordinateString.replace(/'/g, '"'));
            }
            // Format 2: Comma-separated values like "latitude,longitude"
            else if (coordinateString.includes(',')) {
                const parts = coordinateString.split(',');
                coordinates = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
            }
            // Format 3: Space-separated values
            else if (coordinateString.includes(' ')) {
                const parts = coordinateString.split(' ');
                coordinates = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
            }
            // Format 4: Already an array
            else if (Array.isArray(coordinateString)) {
                coordinates = coordinateString;
            }
            
            if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
                const lat = parseFloat(coordinates[0]);
                const lng = parseFloat(coordinates[1]);
                
                // Validate coordinates are reasonable (within world bounds)
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    console.log("Parsed coordinates:", { latitude: lat, longitude: lng });
                    setTrackedEntityCoordinates({ latitude: lat, longitude: lng });
                    return true;
                }
            }
            
            console.warn("Invalid coordinate format or values:", coordinateString);
            return false;
        } catch (error) {
            console.error("Error parsing coordinates:", error);
            return false;
        }
    };

    // Process data elements metadata
    useEffect(() => {
        if (data) {
            const apiData = data as APIResponse;
            const elementsData = apiData?.dataElements?.dataElements;
            
            if (elementsData && Array.isArray(elementsData)) {
                const metadata: DataElementMetadata[] = elementsData.map((element: DataElement) => ({
                    id: element.id,
                    displayName: element.displayName || element.name,
                }));
                
                setDataElementsMetadata(metadata);
                console.log("Data Elements Metadata:", metadata);
            } else {
                console.warn("No data elements found in response");
            }
        }
    }, [data]);

    // Handle heatmap layer updates
    useEffect(() => {
        if (heatmapData.length > 0 && mapRef.current) {
            // Remove existing heatmap layers
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof (L as any).HeatLayer) {
                    mapRef.current?.removeLayer(layer);
                }
            });

            // Add new heatmap layer
            const heatLayer = (L as any).heatLayer(heatmapData, {
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
            });
            
            heatLayer.addTo(mapRef.current);
        }
    }, [heatmapData]);

    // Handle organization unit coordinates from child component
    const handleCoordinatesFetched = (coordinates: [number, number]) => {
        console.log("Org unit coordinates fetched:", coordinates);
        setOrgUnitCoordinates({
            latitude: coordinates[1],  // Note: coordinate order might need adjustment
            longitude: coordinates[0],
        });
    };

    // Loading and error states
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div>Loading map data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger m-3">
                <h4>Error Loading Data</h4>
                <p>Error: {error.message}</p>
                <p>Please check your connection and try again.</p>
            </div>
        );
    }

    if (dataError) {
        return (
            <div className="alert alert-warning m-3">
                <h4>Data Issue</h4>
                <p>{dataError}</p>
                <p>Please check the patient data or contact system administrator.</p>
            </div>
        );
    }

    if (!coordinatesLoaded || (trackedEntityCoordinates.latitude === 0 && trackedEntityCoordinates.longitude === 0)) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div>Loading patient location...</div>
            </div>
        );
    }

    return (
        <div className="layout" style={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <Sidebar selectedEntity={entity} />
            
            {/* Main content area */}
            <div className="content" style={{ flex: 1, padding: '20px' }}>
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title text-center">
                            Map Showing the Patient's Location and Proximity to Health Facilities
                        </h5>
                        
                        {/* Display coordinate information */}
                        <div className="mb-3">
                            <small className="text-muted">
                                Patient Location: {trackedEntityCoordinates.latitude.toFixed(6)}, {trackedEntityCoordinates.longitude.toFixed(6)}
                                {orgUnitCoordinates.latitude !== 0 && (
                                    <> | Health Facility: {orgUnitName}</>
                                )}
                            </small>
                        </div>
                        
                        {/* Hidden component to fetch org unit data */}
                        {entity?.enrollments?.[0]?.orgUnit && (
                            <FetchOrgUnitData
                                orgUnitId={entity.enrollments[0].orgUnit}
                                onCoordinatesFetched={handleCoordinatesFetched}
                            />
                        )}
                        
                        <MapContainer 
                            center={[trackedEntityCoordinates.latitude, trackedEntityCoordinates.longitude]} 
                            zoom={13} 
                            style={{ height: '700px', width: '100%', marginTop: '20px' }}
                            attributionControl={true}
                            ref={mapRef}
                        >
                            <TileLayer 
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
                            {/* Render Organization Unit Marker */}
                            {orgUnitCoordinates.latitude !== 0 && orgUnitCoordinates.longitude !== 0 && (
                                <Marker position={[orgUnitCoordinates.latitude, orgUnitCoordinates.longitude]}>
                                    <Popup>
                                        <div>
                                            <strong>Health Facility</strong><br />
                                            {orgUnitName}<br />
                                            <small>Coordinates: {orgUnitCoordinates.latitude.toFixed(4)}, {orgUnitCoordinates.longitude.toFixed(4)}</small>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                            
                            {/* Render Tracked Entity (Patient) Marker */}
                            <Marker 
                                position={[trackedEntityCoordinates.latitude, trackedEntityCoordinates.longitude]} 
                                icon={new L.Icon({
                                    iconUrl: process.env.PUBLIC_URL + '/patient.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
                                    iconSize: [38, 38], 
                                    shadowSize: [50, 64], 
                                    iconAnchor: [19, 38],
                                    shadowAnchor: [10, 64], 
                                    popupAnchor: [0, -38], 
                                })}
                            >
                                <Popup>
                                    <div>
                                        <strong>Patient Location</strong><br />
                                        ID: {trackerEntityId}<br />
                                        <small>Coordinates: {trackedEntityCoordinates.latitude.toFixed(4)}, {trackedEntityCoordinates.longitude.toFixed(4)}</small>
                                    </div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                        
                        {/* Debug Information (remove in production) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-3">
                                <details>
                                    <summary>Debug Information</summary>
                                    <pre style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '10px' }}>
                                        {JSON.stringify({
                                            trackerEntityId,
                                            coordinatesLoaded,
                                            trackedEntityCoordinates,
                                            orgUnitCoordinates,
                                            orgUnitName,
                                            dataElementsCount: dataElementsMetadata.length
                                        }, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapComponent;