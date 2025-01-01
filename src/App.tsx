import { useDataQuery } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import React, { useState } from 'react';
import TrackerDataTable,  { TrackedEntityInstance } from './components/TrackerDataTable';
import TrackedEntityDetails from './components/TrackedEntityDetails';
import PredictionComponent from './components/PredictionProcessor'; // Import the PredictionComponent
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

// Define your types here
interface Attribute {
    attribute: string;
    value: string;
}

interface Enrollment {
    orgUnitName: string;
}



const query = {
    me: {
        resource: 'me',
    },
};

const MyApp: React.FC = () => {
    const { error, loading, data } = useDataQuery(query);
    const [selectedEntity, setSelectedEntity] = useState<TrackedEntityInstance | null>(null); // State for selected entity

    if (error) {
        return <span>{i18n.t('ERROR')}</span>;
    }

    if (loading) {
        return <span>{i18n.t('Loading...')}</span>;
    }

    const handleEntitySelect = (entity: TrackedEntityInstance) => {
        setSelectedEntity(entity); // Set the selected entity
    };

    return (
        <Router>
            <Switch>
                {/* Root route */}
                <Route exact path="/">
                    <TrackerDataTable onEntitySelect={handleEntitySelect} /> {/* Pass the function as a prop */}
                </Route>
                
                {/* Dynamic route with parameter */}
                <Route path="/TrackedEntityDetails/:trackerEntityId" component={TrackedEntityDetails} />

                {/* Optionally, if you want to display the prediction component */}
                {selectedEntity && (
                    <Route path="/Predictions">
                        <PredictionComponent trackedEntityId={selectedEntity.trackedEntityInstance} />
                    </Route>
                )}
            </Switch>
        </Router>
    );
};

export default MyApp;
