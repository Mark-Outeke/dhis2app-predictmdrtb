import { useParams, useHistory } from 'react-router-dom';
import { useEffect } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';

interface RouteParams {
    trackerEntityId: string;
}

interface TrackedEntity {
    trackedEntityInstance: string;
    enrollments: any[];
    created: string;
    attributes: any[];
    orgUnitName: string;
    events: any[];
    coordinates: Coordinates;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

export const useTrackedEntity = () => {
    const { trackerEntityId } = useParams<RouteParams>();
    const history = useHistory();
    const { loading, error, data } = useDataQuery({
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
    }, { variables: { trackerEntityId } });

    const entity = data?.trackedEntities;

    useEffect(() => {
        if (!entity) {
            return <p>No entity details available.</p>;
        }
    }, [entity]);

    return { loading, error, entity, history };
};
