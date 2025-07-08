import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

interface HeatmapPoint {
    latitude: number;
    longitude: number;
    intensity: number;
}

export const useHeatmap = (heatmapData: HeatmapPoint[]) => {
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (heatmapData.length > 0 && mapRef.current) {
            L.heatLayer(heatmapData.map(point => [point.latitude, point.longitude, point.intensity]), {
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

    return mapRef;
};
