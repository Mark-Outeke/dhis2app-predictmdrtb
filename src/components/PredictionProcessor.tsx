import React, { useEffect, useState } from 'react';
import { useDataQuery } from '@dhis2/app-runtime'; // Use DHIS2 app-runtime for data queries
import { Doughnut, Bar } from 'react-chartjs-2'; // Import Doughnut chart component
import * as tf from '@tensorflow/tfjs'; // Import TensorFlow.js for predictions
import { Chart, ArcElement, registerables } from 'chart.js';

// Register the required elements
Chart.register(ArcElement, ...registerables );

// Define the interface for tracked entity data
interface DataValue { dataElement: string; value: string; }
interface Event { event: string; dataValues: DataValue[]; }
interface Enrollment { events: Event[]; }
interface TrackedEntity { enrollments?: Enrollment[]; id: string; attributes: Record<string, any>;}
interface PredictionComponentProps { trackedEntityId: string;}


const trackedEntityQuery = {
    trackedEntities: {
        resource: "trackedEntityInstances",
        id: ({ trackedEntityId }: { trackedEntityId: string }) => trackedEntityId,
        params: {
            ou: 'akV6429SUqu',
            ouMode: 'DESCENDANTS',
            program : "wfd9K4dQVDR",
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

const dataElementsQuery = {
    dataElements: {
        resource: "dataElements",
        
        params: {
            fields: [
                "id",
                "name",
                "displayName",
            ],
        paging: "false"
        },
    },
};

// Custom hook to fetch data element names
const useDataElementNames = () => {
    const { loading, error, data } = useDataQuery(dataElementsQuery, {});

    const [dataElementNameMapping, setDataElementNameMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!loading && !error && data) {
            console.log('Data Elements:', data);
            const mapping: Record<string, string> = {};
            if (Array.isArray(data.dataElements.dataElements)) {
                data.dataElements.dataElements.forEach((element: { id: string; name: string }) => {
                    mapping[element.id] = element.name;
                });
                setDataElementNameMapping(mapping);
                console.log('Data Element Name Mapping:', mapping);
            } else {
                console.error('data.dataElements.dataElements is not an array:', data.dataElements.dataElements);
            }
        }
    }, [loading, error, data]);

    return dataElementNameMapping;
};

const PredictionComponent: React.FC <PredictionComponentProps>= ({ trackedEntityId }) => {
    console.log("Received trackedEntityId:", trackedEntityId);
    const { loading, error, data } = useDataQuery(trackedEntityQuery, {
        variables: { trackedEntityId },
    });
    const [predictions, setPredictions] = useState<number[]>([]);
    const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);
    const [model, setModel] = useState<tf.LayersModel | null>(null);
    const [tensorInputs, setTensorInputs] = useState<number[][]>([]);
    const [predictionsMade, setPredictionsMade] = useState<boolean>(false);
    const [chartData, setChartData] = useState<any>(null);
    const [featureImportanceChartData, setFeatureImportanceChartData] = useState<any>(null);
    const [averagePrediction, setAveragePrediction] = useState<number>();
    //const [dataElementNameMapping, setDataElementNameMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        // Handle loading state
        if (loading) {
            return;
        }
        // Handle error
        if (error) {
            console.error("Error fetching tracked entities:", error);
            return;
        }
        // Set tracked entities from fetched data
        const fetchedTrackedEntity = data?.trackedEntities;
        setTrackedEntities(fetchedTrackedEntity);

        console.log("Tracked entity:", fetchedTrackedEntity);

        if (fetchedTrackedEntity) {
            const extractedData = extractDataElements(fetchedTrackedEntity);
            console.log("Extracted Data:", extractedData); // Log extracted data

            const processedData = processExtractedData(extractedData, categoricalColumns, numericColumns);
            console.log("Processed Data:", processedData); // Log processed data

            // Call labelEncode and log the encoded data
            const encodeAndLogData = async () => {
                try {
                    const labelEncoders = await loadLabelEncoders();
                    // console.log("Label Encoders:", labelEncoders); // Log label encoders

                    const encodedData = await labelEncode(processedData, categoricalColumns);
                    console.log('Final Encoded Data:', encodedData); // Log the encoded data

                    const scaledData = await scaleNumericData(encodedData, numericColumns);
                    console.log('Final Scaled Data:', scaledData);

                    // Now extract tensor inputs from scaled data
                    const tensorInputs = extractTensorInputs(scaledData) as number[][];
                    setTensorInputs(tensorInputs);
                    console.log('Tensor Inputs:', tensorInputs);

                    // Now you can call makePredictions here and log the predictions
                    if (model && tensorInputs.length > 0) {
                        const predictions = await makePredictions();
                        // console.log('Prediction:', predictions);
                    }

                } catch (encodeError) {
                    console.error('Error encoding data:', encodeError);
                }
            };

            encodeAndLogData(); // Call the async function
        };

    }, [loading, error, data, model, predictionsMade]);

    const categoricalColumns = [
        'LRzaAyb2vGk',  'hDaev1EuehO', 'Aw9p1CCIkqL',
        'TFS9P7tu6U6', 'dtRfCJvzZRF', 'CxdzmL6vtnx', 'U4jSUZPF0HH', 'pDoTShM62yi',
        'PZvOW11mGOq', 'axDtvPeYL2Y', 'FklL99yLd3h', 'FhUzhlhPXqV', 'sM7PAEYRqEP',
        'FZMwpP1ncnZ', 'QzfjeqlwN2c', 't1wRW4bpRrj', 'SoFmSjG4m2N', 'WTz4HSqoE5E',
        'E0oIYbS2lcV', 'f0S6DIqAOE5', 't6qq4TXSE7n', 'pD0tc8UxyGg', 'vKn3Mq4nqOF',
        'ZjimuF1UNdY', 'qZKe08ZA2Jl', 'b801bG8cIxt', 'Nf4Tz0J2vA6', 'pZgD6CYOa96',
        'pg6UUMn87eM', 'EWsKHldwJxa', 'TevjEqHRBdC', 'x7uZB9y0Qey', 'f02UimVxEc2',
    ]; // Replace with actual IDs

    const numericColumns = ['Ghsh3wqVTif', 'xcTT5oXggBZ', 'WBsNDNQUgeX',
        'HzhDngURGLk', 'vZMCHh6nEBZ', 'A0cMF4wzukz',
        'IYvO501ShKB', 'KSzr7m65j5q', 'QtDbhbhXw8w',
        'jnw3HP0Kehx', 'R8wHHdIp2zv', 'gCQbn6KVtTn',
        'IrXoOEno4my', 'BQVLvsEJmSq', 'YFOzTDRhjkF', ];
// Fetch data element names using the custom hook
const dataElementNameMapping = useDataElementNames();

    const extractDataElements = (entity: TrackedEntity) => {
        let extractedData: Record<string, Record<string, string | number | null>> = {};

        // Extracting data from enrollments
        if (entity.enrollments) {
            entity.enrollments.forEach(enrollment => {
                enrollment.events.forEach(event => {
                    let eventData: Record<string, string | number | null> = {};
                    event.dataValues.forEach(dataValue => {
                        if (categoricalColumns.includes(dataValue.dataElement)) {
                            eventData[dataValue.dataElement] = dataValue.value !== undefined ? dataValue.value : null;
                        } else if (numericColumns.includes(dataValue.dataElement)) {
                            // Convert to number
                            const numericValue = parseFloat(dataValue.value);
                            eventData[dataValue.dataElement] = !isNaN(numericValue) ? numericValue : 0;
                        }
                    });
                    extractedData[event.event] = eventData;
                });
            });
        }
        console.log("Extracted data:", extractedData);
        return extractedData;
    };

// Define types for the processed data
type EventProcessedData = Record<string, string | number | null>;
type ProcessedEvent = { event: string; data: EventProcessedData };

// Function to process extracted data
const processExtractedData = (
    extractedData: Record<string, Record<string, string | number | null>>,
    categoricalColumns: string[],
    numericColumns: string[]
): ProcessedEvent[] => {
    // Initialize processedData as an array to store events
    const processedData: ProcessedEvent[] = [];

    console.log("Extracted Data for Processing:", extractedData); // Log the extracted data

    // Iterate over extractedData to combine values for each data element per event
    Object.entries(extractedData).forEach(([eventName, eventData]) => {
        // Create an object for each event
        const eventProcessedData: EventProcessedData = {};

        // Initialize all columns with a default value based on column type
        categoricalColumns.forEach((column) => {
            eventProcessedData[column] = 0; // Default for missing categorical entries
        });
        numericColumns.forEach((column) => {
            eventProcessedData[column] = 0; // Default for missing numerical entries
        });

        // Populate eventProcessedData with actual values from eventData
        Object.entries(eventData).forEach(([dataElement, value]) => {
            if (categoricalColumns.includes(dataElement)) {
                eventProcessedData[dataElement] = value !== undefined ? value : 0;
            } else if (numericColumns.includes(dataElement)) {
                eventProcessedData[dataElement] = value !== undefined ? value : 0;
            }
        });

        //console.log(`Processed data for event ${eventName}:`, eventProcessedData); // Log the processed data for the event

        // Add the processed event to the array
        processedData.push({ event: eventName, data: eventProcessedData });
    });

    console.log('Final Processed Data:', processedData); // Log the final processed data

    // Return processed data
    return processedData;
};

interface ProcessedData {
    event: string;
    data: Record<string, string | number | null>;
}

interface LabelMapping {
    classes: string[];
    mapping: Record<string, number>;
}

interface LabelEncoder {
    [label: string]: LabelMapping;
}

const loadLabelEncoders = async (): Promise<LabelEncoder> => {
    try {
        const response = await fetch('/label_encoders.json');
        if (!response.ok) {
            throw new Error('Failed to load label encoders');
        }
        const labelEncoders: LabelEncoder = await response.json();
        //console.log('Loaded label encoders:', labelEncoders);
        return labelEncoders;
    } catch (encodeError) {
        console.error('Error loading label encoders:', encodeError);
        throw encodeError;
    }
};

const labelEncode = async (processedDataArray: ProcessedData[], categoricalColumns: string[]): Promise<ProcessedData[]> => {
    const labelEncoders: LabelEncoder = await loadLabelEncoders();
    console.log('processing data for label encoding:', processedDataArray);
    const encodedData = processedDataArray.map(row => {
        const newData = new Map<string, string | number | null>(Object.entries(row.data));

        categoricalColumns.forEach((col) => {
            const labelEncoder = labelEncoders[col];
            if (labelEncoder && labelEncoder.mapping) {
                const originalValue = newData.get(col);
                const mapping = labelEncoder.mapping;

                if (mapping[originalValue as string] !== undefined) {
                    newData.set(col, mapping[originalValue as string]);
                } else {
                    newData.set(col, 0); // Handle unknown values
                }
            }
        });

        return { ...row, data: Object.fromEntries(newData) };
    });

    return encodedData;
};

// Define types for the scaler and the data structure
interface Scaler {
    [key: string]: {
        mean: number;
        scale: number;
    };
}

interface RowData {
    [key: string]: number | string | null; // Can include other types depending on your data structure
}

interface DataRow {
    data: RowData;
}

// Normalize numeric data
const loadNumericScaler = async (): Promise<Scaler> => {
    const response = await fetch('/numeric_scaler.json');
    if (!response.ok) {
        throw new Error('Failed to load numeric scaler');
    }
    return await response.json(); // Load and return the JSON content
};

// Scale numeric data
const scaleNumericData = async (data: DataRow[], numericColumns: string[]): Promise<DataRow[]> => {
    const scaler = await loadNumericScaler(); // Load the scaler

    // Ensure the scaler contains mean and scale for each numeric column
    if (!numericColumns.every(col => scaler[col])) {
        throw new Error('Scaler is missing data for one or more numeric columns');
    }

    // Scale numeric data
    data.forEach(row => {
        numericColumns.forEach(col => {
            const { mean, scale } = scaler[col]; // Get mean and scale for the current column
            let value = parseFloat(row.data[col] as string); // Cast to string for parsing

            // console.log(`Scaling value for column '${col}':`, { originalValue: value, mean, scale });
            // Apply scaling formula and ensure no negative values
            if (!isNaN(value)) {
                row.data[col] = Math.max(0, (value - mean) / scale); // Scale the value while ensuring it's non-negative
            } else {
                row.data[col] = 0; // Handle if value is NaN
            }
        });
    });

    return data; // Return scaled data
};

const extractTensorInputs = (data) => {
    if (!data || !Array.isArray(data)) {
        console.error('Invalid data for extracting tensor inputs:', data);
        return []; // Return an empty array or handle it as appropriate
    }

    return data.map(row => {
        const values = Object.values(row.data);
        // Log the type of each value
        values.forEach((value, index) => {
            if (typeof value !== 'number') {
                console.error(`Value at index ${index} is not a number:`, value);
            }
        });
        return values; // Extract values from each row
    });
};

// Define the prediction model

useEffect(() => {
    // log the loaded model
    if (model) {
        console.log('Loaded model:', model);
    } else {
        console.log('Model is not loaded yet.');
    }
    const loadModel = async () => {
        try {
            const loadedModel = await tf.loadLayersModel('/model.json');
            loadedModel.compile({
                optimizer: 'adam', // Specify your optimizer
                loss: 'binaryCrossentropy', // Use appropriate loss based on your model
                metrics: ['accuracy'], // Metrics for tracking
            });
            setModel(loadedModel);
            console.log('Model loaded successfully.');
        } catch (error) {
            console.error('Error loading the TensorFlow model:', error);
        }
    };

    loadModel(); // Call the async function to load the model
}, []);


const makePredictions = async () => {
    if (model && tensorInputs.length > 0) {
        console.log('Running Predictions...');
        const predictions: number[] = [];

        for (let i = 0; i < tensorInputs.length; i++) {
            const inputTensor = tensorInputs[i]; // Create a tensor for the current row
            // Adjust the shape based on the model's input requirements
            const reshapedInput = tf.tensor(inputTensor).reshape([1, 1, 48]); // Assuming 2D input shape [1, 48]

            const outputTensor = model.predict(reshapedInput) as tf.Tensor; // Make predictions
            //console.log('outputTensor ', outputTensor);
            //console.log('outputTensor.shape ', outputTensor.shape);
            const predictionArray = outputTensor.arraySync(); // Extract array
            //console.log('predictionArray', predictionArray);
            const predictionValue = predictionArray[0][0][0]; // Get first output class probabilities
            //console.log('predictionValue', predictionValue);
            // Handle different output shapes based on your model
            if (Array.isArray(predictionValue)) {
                // If predictionValue is an array, assume binary classification
                predictions.push(predictionValue[1] || predictionValue[0]);
            } else {
                // If predictionValue is a single number, handle it accordingly
                // For binary classification, you might want to use a threshold
                predictions.push(predictionValue);
            }
        }

        const averagePrediction = predictions.reduce((acc, curr) => acc + curr, 0) / predictions.length;
        setAveragePrediction(averagePrediction); // Store the average prediction in state
        // Determine 'yes' or 'no' based on the threshold
        const result = averagePrediction >= 0.5 ? 'Yes' : 'No';

        setPredictions(predictions); // Store the predictions in state
        setTensorInputs([]); // Clear the tensor inputs after making predictions
        setPredictionsMade(true); // Set the flag to true to avoid making predictions again
        // Log all predictions to the console
        console.log('ALL Predictions:', predictions);
        console.log('Average Prediction:', averagePrediction);
        console.log('Result:', result);

        const chartData = {
            labels: ['No', 'Yes'],
            datasets: [
                {
                    label: 'Prediction',
                    data: [1 - averagePrediction, averagePrediction],
                    backgroundColor: ['#FF6384', '#36A2EB'],
                    hoverBackgroundColor: ['#FF6384', '#36A2EB'],
                },
            ],
        };

        setChartData(chartData); // Update the chart data state
        console.log('chartData:', chartData);

        // Calculate permutation importance
        calculatePermutationImportance(tensorInputs, predictions, dataElementNameMapping);
    } else {
        console.log('Model or tensorInputs not ready for predictions.');
    }
};

// Define the feature names
const featureNames = [...categoricalColumns, ...numericColumns];

// Calculate permutation importance
const calculatePermutationImportance = async (inputs: number[][], predictions: number[], dataElementNameMapping: Record<string, string>) => {
    if (!model || inputs.length === 0) {
        console.log('Model or inputs not ready for permutation importance.');
        return;
    }

    // Calculate baseline score
    const baselineScore = predictions.reduce((acc, curr) => acc + curr, 0) / predictions.length;

    const featureImportances = Array(inputs[0].length).fill(0);

    for (let col = 0; col < inputs[0].length; col++) {
        const shuffledInputs = inputs.map(row => row.slice()); // Copy inputs to avoid modifying original data

        for (let i = 0; i < shuffledInputs.length; i++) {
            const originalValue = shuffledInputs[i][col];
            const randomIndex = Math.floor(Math.random() * shuffledInputs.length);
            shuffledInputs[i][col] = shuffledInputs[randomIndex][col];
            shuffledInputs[randomIndex][col] = originalValue;
        }

        const shuffledPredictions: number[] = [];
        for (let i = 0; i < shuffledInputs.length; i++) {
            const inputTensor = shuffledInputs[i];
            const reshapedInput = tf.tensor(inputTensor).reshape([1, 1, 48]); // Assuming 2D input shape [1, 48]
            const outputTensor = model.predict(reshapedInput) as tf.Tensor; // Make predictions
            const predictionArray = outputTensor.arraySync(); // Extract array
            const predictionValue = predictionArray[0][0][0]; // Get first output class probabilities

            if (Array.isArray(predictionValue)) {
                shuffledPredictions.push(predictionValue[1] || predictionValue[0]);
            } else {
                shuffledPredictions.push(predictionValue);
            }
        }

        const shuffledScore = shuffledPredictions.reduce((acc, curr) => acc + curr, 0) / shuffledPredictions.length;
        const importance = baselineScore - shuffledScore;

        featureImportances[col] = importance;
        //console.log(`Feature: ${featureNames[col]}, Importance: ${importance}`); // Log the feature name and its computed importance
    }

    // Filter for positive importances
    const positiveFeatureImportances = featureImportances
        .map((importance, index) => ({ feature: dataElementNameMapping[featureNames[index]] || featureNames[index], importance }))
        .filter(item => item.importance > 0); // Keep only positive importances

    // Prepare data for the Bar chart with positive importances
    const featureImportanceChartData = {
        labels: positiveFeatureImportances.map(item => item.feature),
        datasets: [
            {
                label: 'Permutation Importance',
                data: positiveFeatureImportances.map(item => item.importance),
                backgroundColor: '#36A2EB',
                hoverBackgroundColor: '#36A2EB',
            },
        ],
    };

    setFeatureImportanceChartData(featureImportanceChartData); // Update state with filtered data
};

useEffect(() => {
    if (model && tensorInputs.length > 0 && !predictionsMade) {
        makePredictions();
    }
}, [model, tensorInputs, predictionsMade]);

const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: '300px',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    margin: '20px 0',
    textAlign: 'left',
};

const likelihoodText = averagePrediction !== undefined ? (averagePrediction >= 0.5 ? 'Yes' : 'No') : 'No'; // Determine likelihood text

return (
    <div>
        <h1>Prediction Overview</h1>
        <p>This component is responsible for predicting the likelihood of a tracked entity instance to develop MDR-TB.</p>

        {/* Container for both charts */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>

            {/* Doughnut Chart */}
            {chartData && (
                <div style={{ ...cardStyle, width: '400px' }}>
                    <Doughnut data={chartData} />
                    <p>Final Prediction Probability: {Math.round((averagePrediction || 0) * 1000) / 1000}</p>
                    <p>Patient Likely to Develop MDRTB: {likelihoodText}</p>
                </div>
            )}

            {/* Feature Importance Bar Chart */}
            {featureImportanceChartData && (
                <div style={{ width: '800px', height: '500px' }}>
                    <Bar
                        data={featureImportanceChartData}
                        options={{
                            indexAxis: 'y',
                            elements: {
                                bar: {
                                    borderWidth: 2,
                                    borderColor: '#fff',
                                },
                            },
                            plugins: {
                                legend: { display: false },
                                title: {
                                    display: true,
                                    text: 'Contributing Factor',
                                    font: { size: 20 },
                                },
                            },
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Importance Score',
                                        font: { size: 16 },
                                    },
                                    ticks: {
                                        font: { size: 14 },
                                    },
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Features',
                                        font: { size: 16 },
                                    },
                                    ticks: {
                                        font: { size: 14 },
                                    },
                                },
                            },
                        }}
                    />
                </div>
            )}
        </div>

        {/* Predictions List */}
        {predictions.map((prediction, index) => (
            <div key={index}>Prediction for event {index}: {prediction}</div>
        ))}
    </div>
);

};

export default PredictionComponent;
