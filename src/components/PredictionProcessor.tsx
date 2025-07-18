import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import { Doughnut, Bar } from 'react-chartjs-2';
import * as tf from '@tensorflow/tfjs';
import { Chart, ArcElement, registerables } from 'chart.js';

// Register the required elements
Chart.register(ArcElement, ...registerables);

// Define interfaces
interface DataValue { 
    dataElement: string; 
    value: string; 
}

interface DataElement {
  id: string;
  name: string;
  displayName: string;
}

interface Event {
  event: string;           
  eventDate: string;       
  dataValues: Array<{
    dataElement: string;
    value: string;
  }>;
}

interface Enrollment { 
    enrollment: string;
    orgUnit: string;
    program: string;
    events: Event[]; 
}

interface TrackedEntity {
  trackedEntityInstance: string;
  enrollments: Array<{
    enrollment: string;
    orgUnit: string;
    program: string;
    events: Event[];
  }>;
  attributes: Array<{
    attribute: string;
    value: string;
  }>;
}

interface APIResponse {
  dataElements?: {
    dataElements: DataElement[];
  };
  trackedEntities?: TrackedEntity | TrackedEntity[];
}

interface PredictionComponentProps { 
    trackedEntityId: string;
}

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

interface Scaler {
    [key: string]: {
        mean: number;
        scale: number;
    };
}

interface RowData {
    [key: string]: number | string | null;
}

interface DataRow {
    data: RowData;
}

type EventProcessedData = Record<string, string | number | null>;
type ProcessedEvent = { event: string; data: EventProcessedData };

// Queries - Fixed query structure
const trackedEntityQuery = {
  trackedEntities: {
    resource: "trackedEntityInstances",
    id: (variables: any) => variables.trackedEntityId,
    params: {
      ou: 'akV6429SUqu',
      ouMode: 'DESCENDANTS',
      program: "wfd9K4dQVDR",
      fields: [
        "trackedEntityInstance",
        "enrollments[enrollment,orgUnit,program,events[event,eventDate,dataValues[dataElement,value]]]",
        "created", 
        "attributes[attribute,value,displayName]",
        "orgUnitName",
        "coordinates",
      ],
    },
  },
};

const dataElementsQuery = {
  dataElements: {
    resource: "dataElements",
    params: {
      fields: ["id", "name", "displayName"],
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
      const mapping: Record<string, string> = {};
      
      // Type assertion to fix the dataElements error
      const apiData = data as APIResponse;
      
      // Safe access with proper type checking
      const elements = apiData?.dataElements?.dataElements;
      if (elements && Array.isArray(elements)) {
        elements.forEach((element: DataElement) => {
          mapping[element.id] = element.name || element.displayName;
        });
        setDataElementNameMapping(mapping);
        console.log('Data element names loaded successfully:', Object.keys(mapping).length, 'elements');
      } else {
        console.log('No data elements found or invalid structure');
        setDataElementNameMapping({});
      }
    }
  }, [loading, error, data]);

  return { dataElementNameMapping, loading, error };
};

const PredictionComponent: React.FC<PredictionComponentProps> = ({ trackedEntityId }) => {
    console.log("Received trackedEntityId:", trackedEntityId);
    
    const { loading, error, data } = useDataQuery(trackedEntityQuery, {
        variables: { trackedEntityId },
    });

    // State management
    const [predictions, setPredictions] = useState<number[]>([]);
    const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);
    const [model, setModel] = useState<tf.LayersModel | null>(null);
    const [tensorInputs, setTensorInputs] = useState<number[][]>([]);
    const [predictionsMade, setPredictionsMade] = useState<boolean>(false);
    const [chartData, setChartData] = useState<any>(null);
    const [featureImportanceChartData, setFeatureImportanceChartData] = useState<any>(null);
    const [averagePrediction, setAveragePrediction] = useState<number>();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [modelLoading, setModelLoading] = useState<boolean>(false);

    // Use refs to prevent unnecessary re-renders
    const modelRef = useRef<tf.LayersModel | null>(null);
    const dataProcessedRef = useRef<boolean>(false);
    const labelEncodersRef = useRef<LabelEncoder | null>(null);
    const numericScalerRef = useRef<Scaler | null>(null);

    const { dataElementNameMapping, loading: elementsLoading, error: elementsError } = useDataElementNames();

    // Column definitions
    const categoricalColumns = [
        'LRzaAyb2vGk', 'hDaev1EuehO', 'Aw9p1CCIkqL',
        'TFS9P7tu6U6', 'dtRfCJvzZRF', 'CxdzmL6vtnx', 'U4jSUZPF0HH', 'pDoTShM62yi',
        'PZvOW11mGOq', 'axDtvPeYL2Y', 'FklL99yLd3h', 'FhUzhlhPXqV', 'sM7PAEYRqEP',
        'FZMwpP1ncnZ', 'QzfjeqlwN2c', 't1wRW4bpRrj', 'SoFmSjG4m2N', 'WTz4HSqoE5E',
        'E0oIYbS2lcV', 'f0S6DIqAOE5', 't6qq4TXSE7n', 'pD0tc8UxyGg', 'vKn3Mq4nqOF',
        'ZjimuF1UNdY', 'qZKe08ZA2Jl', 'b801bG8cIxt', 'Nf4Tz0J2vA6', 'pZgD6CYOa96',
        'pg6UUMn87eM', 'EWsKHldwJxa', 'TevjEqHRBdC', 'x7uZB9y0Qey', 'f02UimVxEc2',
    ];

    const numericColumns = [
        'Ghsh3wqVTif', 'xcTT5oXggBZ', 'WBsNDNQUgeX',
        'HzhDngURGLk', 'vZMCHh6nEBZ', 'A0cMF4wzukz',
        'IYvO501ShKB', 'KSzr7m65j5q', 'QtDbhbhXw8w',
        'jnw3HP0Kehx', 'R8wHHdIp2zv', 'gCQbn6KVtTn',
        'IrXoOEno4my', 'BQVLvsEJmSq', 'YFOzTDRhjkF',
    ];

    const featureNames = [...categoricalColumns, ...numericColumns];

    // Debug effect to monitor data element mapping
    useEffect(() => {
        console.log('Data element mapping status:', {
            loading: elementsLoading,
            error: elementsError,
            mappingCount: Object.keys(dataElementNameMapping).length,
            sampleMappings: Object.entries(dataElementNameMapping).slice(0, 3)
        });
    }, [dataElementNameMapping, elementsLoading, elementsError]);

    // Updated model loading path with PUBLIC_URL
    useEffect(() => {
        const loadModel = async () => {
            if (modelRef.current || modelLoading) return;

            try {
                setModelLoading(true);
                console.log('Loading TensorFlow model...');
                
                // Use PUBLIC_URL for proper asset path resolution
                const modelPath = `${process.env.PUBLIC_URL || ''}/model.json`;
                console.log('Model path:', modelPath);
                
                const loadedModel = await tf.loadLayersModel(modelPath);
                loadedModel.compile({
                    optimizer: 'adam',
                    loss: 'binaryCrossentropy',
                    metrics: ['accuracy'],
                });
                setModel(loadedModel);
                modelRef.current = loadedModel;
                console.log('Model loaded successfully.');
            } catch (error) {
                console.error('Error loading the TensorFlow model:', error);
                setProcessingError('Failed to load prediction model');
            } finally {
                setModelLoading(false);
            }
        };

        loadModel();
    }, []);

    // Load encoders with PUBLIC_URL
    const loadLabelEncoders = useCallback(async (): Promise<LabelEncoder> => {
        if (labelEncodersRef.current) {
            return labelEncodersRef.current;
        }

        try {
            const encodersPath = `${process.env.PUBLIC_URL || ''}/label_encoders.json`;
            console.log('Loading label encoders from:', encodersPath);
            
            const response = await fetch(encodersPath);
            if (!response.ok) {
                throw new Error(`Failed to load label encoders: ${response.status} ${response.statusText}`);
            }
            const labelEncoders: LabelEncoder = await response.json();
            labelEncodersRef.current = labelEncoders;
            console.log('Label encoders loaded successfully');
            return labelEncoders;
        } catch (error) {
            console.error('Error loading label encoders:', error);
            throw error;
        }
    }, []);

    // Load scaler with PUBLIC_URL
    const loadNumericScaler = useCallback(async (): Promise<Scaler> => {
        if (numericScalerRef.current) {
            return numericScalerRef.current;
        }

        try {
            const scalerPath = `${process.env.PUBLIC_URL || ''}/numeric_scaler.json`;
            console.log('Loading numeric scaler from:', scalerPath);
            
            const response = await fetch(scalerPath);
            if (!response.ok) {
                throw new Error(`Failed to load numeric scaler: ${response.status} ${response.statusText}`);
            }
            const scaler: Scaler = await response.json();
            numericScalerRef.current = scaler;
            console.log('Numeric scaler loaded successfully');
            return scaler;
        } catch (error) {
            console.error('Error loading numeric scaler:', error);
            throw error;
        }
    }, []);

    // Fixed Extract data elements function
    const extractDataElements = useCallback((entity: TrackedEntity) => {
        let extractedData: Record<string, Record<string, string | number | null>> = {};

        console.log('Entity structure:', entity);
        console.log('Available data element mapping:', Object.keys(dataElementNameMapping).length, 'elements');

        if (!entity.enrollments || !Array.isArray(entity.enrollments)) {
            console.warn('No enrollments found or enrollments is not an array');
            return extractedData;
        }

        entity.enrollments.forEach((enrollment, enrollmentIndex) => {
            console.log(`Processing enrollment ${enrollmentIndex}:`, enrollment);
            
            if (!enrollment.events || !Array.isArray(enrollment.events)) {
                console.warn(`No events found in enrollment ${enrollmentIndex}`);
                return;
            }

            enrollment.events.forEach((event, eventIndex) => {
                console.log(`Processing event ${eventIndex}:`, event);
                
                if (!event.dataValues || !Array.isArray(event.dataValues)) {
                    console.warn(`No dataValues found in event ${eventIndex}`);
                    return;
                }

                let eventData: Record<string, string | number | null> = {};
                
                event.dataValues.forEach(dataValue => {
                    if (!dataValue.dataElement) {
                        console.warn('DataValue missing dataElement:', dataValue);
                        return;
                    }

                    // Log data element mapping for debugging
                    const elementName = dataElementNameMapping[dataValue.dataElement];
                    if (elementName) {
                        //console.log(`Mapped ${dataValue.dataElement} to ${elementName}`);
                    }

                    if (categoricalColumns.includes(dataValue.dataElement)) {
                        eventData[dataValue.dataElement] = dataValue.value !== undefined ? dataValue.value : null;
                    } else if (numericColumns.includes(dataValue.dataElement)) {
                        const numericValue = parseFloat(dataValue.value);
                        eventData[dataValue.dataElement] = !isNaN(numericValue) ? numericValue : 0;
                    }
                });
                
                // Use event ID or create a unique key
                const eventKey = event.event || `event_${enrollmentIndex}_${eventIndex}`;
                extractedData[eventKey] = eventData;
            });
        });

        console.log("Final extracted data:", extractedData);
        return extractedData;
    }, [categoricalColumns, numericColumns, dataElementNameMapping]);

    // Process extracted data
    const processExtractedData = useCallback((
        extractedData: Record<string, Record<string, string | number | null>>,
        categoricalColumns: string[],
        numericColumns: string[]
    ): ProcessedEvent[] => {
        const processedData: ProcessedEvent[] = [];

        console.log("Extracted Data for Processing:", extractedData);

        Object.entries(extractedData).forEach(([eventName, eventData]) => {
            const eventProcessedData: EventProcessedData = {};

            // Initialize all columns with defaults
            categoricalColumns.forEach((column) => {
                eventProcessedData[column] = 0;
            });
            numericColumns.forEach((column) => {
                eventProcessedData[column] = 0;
            });

            // Populate with actual values
            Object.entries(eventData).forEach(([dataElement, value]) => {
                if (categoricalColumns.includes(dataElement)) {
                    eventProcessedData[dataElement] = value !== undefined ? value : 0;
                } else if (numericColumns.includes(dataElement)) {
                    eventProcessedData[dataElement] = value !== undefined ? value : 0;
                }
            });

            processedData.push({ event: eventName, data: eventProcessedData });
        });

        console.log('Final Processed Data:', processedData);
        return processedData;
    }, []);

    // Optimized label encoding
    const labelEncode = useCallback(async (
        processedDataArray: ProcessedData[], 
        categoricalColumns: string[], 
        labelEncoders: LabelEncoder
    ): Promise<ProcessedData[]> => {
        console.log('Processing data for label encoding:', processedDataArray);
        
        return processedDataArray.map(row => {
            const newData = { ...row.data };

            categoricalColumns.forEach((col) => {
                const labelEncoder = labelEncoders[col];
                if (labelEncoder?.mapping) {
                    const originalValue = newData[col];
                    const mapping = labelEncoder.mapping;
                    newData[col] = mapping[originalValue as string] !== undefined 
                        ? mapping[originalValue as string] 
                        : 0;
                }
            });

            return { ...row, data: newData };
        });
    }, []);

    // Optimized scaling
    const scaleNumericData = useCallback(async (
        data: DataRow[], 
        numericColumns: string[], 
        scaler: Scaler
    ): Promise<DataRow[]> => {
        if (!numericColumns.every(col => scaler[col])) {
            throw new Error('Scaler is missing data for one or more numeric columns');
        }

        return data.map(row => {
            const newData = { ...row.data };
            
            numericColumns.forEach(col => {
                const { mean, scale } = scaler[col];
                const value = parseFloat(newData[col] as string);
                
                if (!isNaN(value)) {
                    newData[col] = Math.max(0, (value - mean) / scale);
                } else {
                    newData[col] = 0;
                }
            });

            return { ...row, data: newData };
        });
    }, []);

    // Extract tensor inputs
    const extractTensorInputs = useCallback((data: any) => {
        if (!data || !Array.isArray(data)) {
            console.error('Invalid data for extracting tensor inputs:', data);
            return [];
        }

        return data.map(row => {
            const values = Object.values(row.data);
            values.forEach((value, index) => {
                if (typeof value !== 'number') {
                    console.error(`Value at index ${index} is not a number:`, value);
                }
            });
            return values;
        });
    }, []);

    // Fixed Calculate permutation importance
    const calculatePermutationImportance = useCallback(async (
        inputs: number[][], 
        predictions: number[], 
        dataElementNameMapping: Record<string, string>,
        model: tf.LayersModel
    ) => {
        if (!model || inputs.length === 0) {
            console.log('Model or inputs not ready for permutation importance.');
            return;
        }

        try {
            console.log('Calculating feature importance...');
            console.log('Available mappings:', Object.keys(dataElementNameMapping).length);
            
            const baselineScore = predictions.reduce((acc, curr) => acc + curr, 0) / predictions.length;
            const featureImportances = Array(inputs[0].length).fill(0);

            for (let col = 0; col < inputs[0].length; col++) {
                const shuffledInputs = inputs.map(row => row.slice());

                // Shuffle the column
                for (let i = shuffledInputs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledInputs[i][col], shuffledInputs[j][col]] = [shuffledInputs[j][col], shuffledInputs[i][col]];
                }

                const shuffledPredictions: number[] = [];
                
                // Process shuffled predictions with tensor cleanup
                for (let i = 0; i < shuffledInputs.length; i++) {
                    const inputTensor = tf.tensor(shuffledInputs[i]).reshape([1, 1, 48]);
                    const outputTensor = model.predict(inputTensor) as tf.Tensor;
                    const predictionArray = await outputTensor.data();
                    
                    // Clean up tensors
                    inputTensor.dispose();
                    outputTensor.dispose();
                    
                    shuffledPredictions.push(predictionArray[0]);
                }

                const shuffledScore = shuffledPredictions.reduce((acc, curr) => acc + curr, 0) / shuffledPredictions.length;
                const importance = baselineScore - shuffledScore;
                featureImportances[col] = importance;
            }

            // Filter for positive importances with better mapping
            const positiveFeatureImportances = featureImportances
                .map((importance, index) => {
                    const featureId = featureNames[index];
                    const featureName = dataElementNameMapping[featureId] || featureId;
                    
                    //console.log(`Feature ${index}: ${featureId} -> ${featureName} (importance: ${importance})`);
                    
                    return { 
                        feature: featureName, 
                        importance,
                        id: featureId
                    };
                })
                .filter(item => item.importance > 0)
                .sort((a, b) => b.importance - a.importance) // Sort by importance
                .slice(0, 15); // Show top 15 features

            console.log('Top positive feature importances:', positiveFeatureImportances);

            // Prepare chart data
            const featureImportanceChartData = {
                labels: positiveFeatureImportances.map(item => item.feature),
                datasets: [{
                    label: 'Permutation Importance',
                    data: positiveFeatureImportances.map(item => item.importance),
                    backgroundColor: '#36A2EB',
                    hoverBackgroundColor: '#36A2EB',
                }],
            };

            setFeatureImportanceChartData(featureImportanceChartData);
            console.log('Feature importance chart data set successfully');
        } catch (error) {
            console.error('Error calculating feature importance:', error);
        }
    }, [featureNames]);

    // Optimized prediction function
    const makePredictions = useCallback(async (inputs: number[][], model: tf.LayersModel) => {
        if (predictionsMade) return;

        try {
            console.log('Running Predictions...');
            const predictions: number[] = [];

            // Process predictions and dispose tensors immediately
            for (let i = 0; i < inputs.length; i++) {
                const inputTensor = tf.tensor(inputs[i]).reshape([1, 1, 48]);
                const outputTensor = model.predict(inputTensor) as tf.Tensor;
                const predictionArray = await outputTensor.data();
                
                // Clean up tensors immediately
                inputTensor.dispose();
                outputTensor.dispose();

                const predictionValue = predictionArray[0];
                predictions.push(predictionValue);
            }

            const averagePrediction = predictions.reduce((acc, curr) => acc + curr, 0) / predictions.length;
            setAveragePrediction(averagePrediction);

            const result = averagePrediction >= 0.5 ? 'Yes' : 'No';

            setPredictions(predictions);
            setPredictionsMade(true);

            console.log('ALL Predictions:', predictions);
            console.log('Average Prediction:', averagePrediction);
            console.log('Result:', result);

            // Update chart data
            const chartData = {
                labels: ['No', 'Yes'],
                datasets: [{
                    label: 'Prediction',
                    data: [1 - averagePrediction, averagePrediction],
                    backgroundColor: ['#FF6384', '#36A2EB'],
                    hoverBackgroundColor: ['#FF6384', '#36A2EB'],
                }],
            };

            setChartData(chartData);

            // Calculate feature importance
            await calculatePermutationImportance(inputs, predictions, dataElementNameMapping, model);

        } catch (error) {
            console.error('Error making predictions:', error);
            setProcessingError('Failed to generate predictions');
        }
    }, [predictionsMade, dataElementNameMapping, calculatePermutationImportance]);

    // Fixed Main data processing effect
    useEffect(() => {
        if (loading || error || !data || dataProcessedRef.current || isProcessing || elementsLoading) {
            return;
        }

        // Don't process if data elements haven't loaded yet
        if (elementsError) {
            setProcessingError('Failed to load data element names');
            return;
        }

        const processData = async () => {
            try {
                setIsProcessing(true);
                setProcessingError(null);
                dataProcessedRef.current = true;

                // Type assertion and proper data handling
                const apiData = data as APIResponse;
                const fetchedTrackedEntity = apiData?.trackedEntities;
                
                if (!fetchedTrackedEntity) {
                    console.warn('No tracked entities found in response');
                    setProcessingError('No patient data found');
                    return;
                }

                // Handle both single entity and array responses
                let entityToProcess: TrackedEntity;
                if (Array.isArray(fetchedTrackedEntity)) {
                    setTrackedEntities(fetchedTrackedEntity); // Now it's properly typed as array
                    entityToProcess = fetchedTrackedEntity[0];
                } else {
                    setTrackedEntities([fetchedTrackedEntity]); // Wrap single entity in array
                    entityToProcess = fetchedTrackedEntity;
                }

                console.log("Processing entity:", entityToProcess);

                const extractedData = extractDataElements(entityToProcess);
                console.log("Extracted Data:", extractedData);

                // Check if we have any data to process
                if (Object.keys(extractedData).length === 0) {
                    console.warn('No data elements extracted from patient');
                    setProcessingError('No patient data available for prediction');
                    return;
                }

                const processedData = processExtractedData(extractedData, categoricalColumns, numericColumns);
                console.log("Processed Data:", processedData);

                if (processedData.length === 0) {
                    console.warn('No processed data available');
                    setProcessingError('Unable to process patient data');
                    return;
                }

                // Load encoders and scalers in parallel
                const [labelEncoders, numericScaler] = await Promise.all([
                    loadLabelEncoders(),
                    loadNumericScaler()
                ]);

                // Process data pipeline
                const encodedData = await labelEncode(processedData, categoricalColumns, labelEncoders);
                console.log('Final Encoded Data:', encodedData);

                const scaledData = await scaleNumericData(encodedData, numericColumns, numericScaler);
                console.log('Final Scaled Data:', scaledData);

                const tensorInputs = extractTensorInputs(scaledData) as number[][];
                setTensorInputs(tensorInputs);
                console.log('Tensor Inputs:', tensorInputs);

                // Make predictions if model is ready and we have valid inputs
                if (modelRef.current && tensorInputs.length > 0 && tensorInputs[0]?.length > 0) {
                    console.log('Model and tensor inputs ready, making predictions...');
                    await makePredictions(tensorInputs, modelRef.current);
                } else {
                    console.warn('Model not ready or invalid tensor inputs');
                    if (!modelRef.current) {
                        setProcessingError('Prediction model not loaded');
                    } else if (tensorInputs.length === 0) {
                        setProcessingError('No valid input data for predictions');
                    }
                }
            } catch (error) {
                console.error('Error processing data:', error);
                setProcessingError(`Failed to process patient data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsProcessing(false);
            }
        };

        processData();
    }, [loading, error, data, elementsLoading, elementsError, dataElementNameMapping, extractDataElements, processExtractedData, labelEncode, scaleNumericData, extractTensorInputs, makePredictions, loadLabelEncoders, loadNumericScaler]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            // Cleanup tensors on unmount
            if (modelRef.current) {
                modelRef.current.dispose();
            }
        };
    }, []);

    // Loading and error states
    if (loading) {
        return <div>Loading patient data...</div>;
    }

    if (error) {
        return <div>Error loading patient data: {error.message}</div>;
    }

    if (processingError) {
        return <div>Error: {processingError}</div>;
    }

    if (isProcessing || modelLoading) {
        return <div>Processing patient data for predictions...</div>;
    }

    // Card styles
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

    const likelihoodText = averagePrediction !== undefined ? (averagePrediction >= 0.5 ? 'Yes' : 'No') : 'No';

    return (
        <div>
            <h1>Prediction Overview</h1>
            <p>This is presented as a summary for predicting the likelihood of a DSTB Patient to develop MDR-TB.</p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                {chartData && (
                    <div style={{ ...cardStyle, width: '400px' }}>
                        <Doughnut data={chartData} />
                        <p>Final Prediction Probability: {Math.round((averagePrediction || 0) * 1000) / 1000}</p>
                        <p>Patient Likely to Develop MDRTB: {likelihoodText}</p>
                    </div>
                )}

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
                                        text: 'Contributing Factors',
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
        </div>
    );
};

export default PredictionComponent;