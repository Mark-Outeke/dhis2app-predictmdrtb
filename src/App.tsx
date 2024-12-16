import { useDataQuery } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import React from 'react';
import TrackerDataTable from './components/TrackerDataTable';
import TrackedEntityDetails from './components/TrackedEntityDetails';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

const query = {
    me: {
        resource: 'me',
    },
};

const MyApp: React.FC = () => {
    const { error, loading, data } = useDataQuery(query);

    if (error) {
        return <span>{i18n.t('ERROR')}</span>;
    }

    if (loading) {
        return <span>{i18n.t('Loading...')}</span>;
    }

    return (
        <Router>
            <Switch>
                {/* Root route */}
                <Route exact path="/" component={TrackerDataTable } />
                
                {/* Dynamic route with parameter */}
                <Route path="/TrackedEntityDetails/:trackerEntityId" component={TrackedEntityDetails} />
            </Switch>
        </Router>
    );
};

export default MyApp;
