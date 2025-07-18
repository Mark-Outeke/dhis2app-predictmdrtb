const config = {
    type: 'app',
    name: 'dhis2-app',
    version: '1.1.0',
    title: 'Predict MDR Tracker',
    description: 'A DHIS2 app for tracking TB patients to predict MDR',
    entryPoints: {
        app: './src/App.tsx',
    },
    icon: './img/predictMDRTB.png',
}

module.exports = config
