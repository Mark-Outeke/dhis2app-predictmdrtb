import { useDataQuery } from '@dhis2/app-runtime';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as turf from '@turf/turf';


interface Coordinate {
  lat: number;
  lng: number;
}

interface TrackedEntityInstance {
  attributes: { displayName: string; value: string }[];
  geometry: { coordinates: [number, number] };
}

interface HotspotProcessorProps {
  setHeatmapData: (data: [number, number, number][]) => void;
}

const coordinatesQuery = {
  trackedEntities: {
    resource: 'trackedEntityInstances',
    params: {
      ou: 'akV6429SUqu',
      ouMode: 'DESCENDANTS',
      program: 'wfd9K4dQVDR',
      fields: ['geometry', 'attributes[displayName,value]'],
      skipPaging: 'true',
    },
  },
};

const HotspotProcessor: React.FC<HotspotProcessorProps> = ({ setHeatmapData }) => {
  const trackedEntityType = 'MCPQUTHX1Ze';
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef<boolean>(false);

  const extractCoordinates = (data) => {
    const instances = data.trackedEntityInstances || [];
    console.log(`instances: `, instances);
    console.log('typeof instances:', typeof instances);
    return instances.map((entity) => {
        const gisAttr = entity.attributes.find(attr => attr.displayName === 'GIS Coordinates');
        if (gisAttr) {
            try {
                const [lng, lat] = JSON.parse(gisAttr.value);
                return { lat, lng };
            } catch (error) {
                console.error('Invalid GIS Coordinates:', error);
            }
        } else if (entity.geometry && entity.geometry.coordinates) {
            return { lat: entity.geometry.coordinates[1], lng: entity.geometry.coordinates[0] };
        }
        return null;
    })
    .filter((coord) => coord !== null);
};


  const createHeatmap = useCallback((coordinates: Coordinate[]) => {
    const heatmapData: [number, number, number][] = coordinates.map(coord => [coord.lat, coord.lng, 1]);
    setHeatmapData(heatmapData);

    const points = coordinates.map(coord => turf.point([coord.lng, coord.lat]));
    const featureCollection = turf.featureCollection(points);

    const maxDistance = 0.0001; // Distance in kilometers
    const minPoints = 3;

    const clusters = turf.clustersDbscan(featureCollection, maxDistance, { minPoints, units: 'kilometers' });

    return clusters.features;
  }, [setHeatmapData]);

  const { loading, error: queryError, data } = useDataQuery(coordinatesQuery);

  useEffect(() => {
    if (hasFetched.current) return;
    if (loading) return;
    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
      return;
    }
    if (data && data.trackedEntities) {
      hasFetched.current = true;
      try {
        const coordinates = extractCoordinates(data.trackedEntities);
        console.log(`Fetched ${coordinates.length} coordinates.`);
        console.log(coordinates);
        createHeatmap(coordinates);
      } catch (error) {
        console.error('Error occurred during fetching or processing:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [loading, queryError, data, createHeatmap]);

  if (isLoading) return <div>Loading hotspots...</div>;
  if (error) return <div>Error: {error}</div>;

  return null;
};

export default HotspotProcessor;
