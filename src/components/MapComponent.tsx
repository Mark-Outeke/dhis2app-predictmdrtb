// MapComponent.tsx
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
}

const MapComponent = () => {
    const { trackerEntityId } = useParams<RouteParams>();
    
    const [entity, setEntity] = useState<any | null>(null);
    const [dataElementsMetadata, setDataElementsMetadata] = useState<DataElementMetadata[]>([]);
    
    const [orgUnitCoordinates, setOrgUnitCoordinates] = useState<Coordinates>({ latitude: 0, longitude: 0 });
    const [trackedEntityCoordinates, setTrackedEntityCoordinates] = useState<Coordinates>({ latitude: 0, longitude: 0 });
    const [orgUnitName, setOrgUnitName] = useState<string>('N/A');
    const [heatmapData, setHeatmapData] = useState<[number, number, number][]>([]);
    const mapRef = useRef<L.Map | null>(null);

    const QUERY = {
        trackedEntities: {
            resource: "trackedEntityInstances",
            id: ({ trackerEntityId }: any) => trackerEntityId,
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

    const { loading, error, data } = useDataQuery(QUERY, {
        variables: { trackerEntityId: trackerEntityId },
    });

    useEffect(() => {
        if (data?.trackedEntities) {
            const entityData = data.trackedEntities as any;
            setEntity(entityData);
            console.log("Entity data:", entityData);

            const orgUnitId = entityData.enrollments?.[0]?.orgUnit;
            console.log("orgUnitId:", orgUnitId);
            const orgUnitName = entityData.enrollments?.[0]?.orgUnitName || 'N/A';
            setOrgUnitName(orgUnitName);

            const attributes = entityData.attributes || [];
            const gisCoordinatesAttr = attributes.find((attr: any) => attr.displayName === "GIS Coordinates");
            
            if (gisCoordinatesAttr) {
                try {
                    const gisCoordinates = JSON.parse(gisCoordinatesAttr.value.replace(/'/g, '"'));
                    console.log("GIS Coordinates: ", gisCoordinates);
                    setTrackedEntityCoordinates({
                        latitude: gisCoordinates[0],
                        longitude: gisCoordinates[1],
                    });
                } catch (error) {
                    console.error("Error parsing coordinates:", error);
                    setTrackedEntityCoordinates({ latitude: 0, longitude: 0 });
                }
            }
        }
    }, [data]);

    useEffect(() => {
        if (data?.dataElements?.dataElements) {
            const metadata = (data.dataElements as any).dataElements;
            setDataElementsMetadata(metadata);
            console.log("Data Elements Metadata:", metadata);
        }
    }, [data]);

    useEffect(() => {
        if (heatmapData.length > 0 && mapRef.current) {
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof (L as any).HeatLayer) {
                    mapRef.current?.removeLayer(layer);
                }
            });

            (L as any).heatLayer(heatmapData, {
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

    const handleCoordinatesFetched = (coordinates: [number, number]) => {
        setOrgUnitCoordinates({
            latitude: coordinates[1],
            longitude: coordinates[0],
        });
    };

    if (loading) return <div>Loading map data...</div>;
    if (error) return <p>Error: {error.message}</p>;

    if (trackedEntityCoordinates.latitude === 0 && trackedEntityCoordinates.longitude === 0) {
        return <div>Loading patient location...</div>;
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
                            Map Showing the Patient's Location and Proximity to Hotspots
                        </h5>
                        
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
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            
                            {/* Render Org Unit Marker */}
                            {orgUnitCoordinates.latitude !== 0 && orgUnitCoordinates.longitude !== 0 && (
                                <Marker position={[orgUnitCoordinates.latitude, orgUnitCoordinates.longitude]}>
                                    <Popup>Organization Unit: {orgUnitName}</Popup>
                                </Marker>
                            )}
                            
                            {/* Render Tracked Entity Marker */}
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
                                <Popup>Patient ID: {trackerEntityId}</Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapComponent;