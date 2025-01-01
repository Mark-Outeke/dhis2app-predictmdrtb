import React, { useEffect, useState } from 'react';
import { useDataQuery } from '@dhis2/app-runtime'; // Use DHIS2 app-runtime for data queries
import { Doughnut } from 'react-chartjs-2'; // Import Doughnut chart component
import * as tf from '@tensorflow/tfjs'; // Import TensorFlow.js for predictions
//import { TrackedEntityInstance } from './TrackerDataTable';
import { Chart, ArcElement } from 'chart.js';

// Register the required elements
Chart.register(ArcElement);

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


const PredictionComponent: React.FC <PredictionComponentProps>= ({ trackedEntityId }) => {
    console.log("Received trackedEntityId:", trackedEntityId);
    const { loading, error, data } = useDataQuery(trackedEntityQuery,{
        variables: { trackedEntityId },}
    );
    const [predictions, setPredictions] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);
    const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);

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
            const processedData = processExtractedData(extractedData, categoricalColumns, numericColumns);
        }


    }, [loading, error, data]);

    const categoricalColumns =     [ 'LRzaAyb2vGk','hDaev1EuehO', 'Aw9p1CCIkqL',
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
                          'IrXoOEno4my', 'BQVLvsEJmSq', 'YFOzTDRhjkF',];


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


   

    return (
        <div>
            <h1>Prediction Component</h1>
            <p>This component is responsible for predicting the likelihood of a tracked entity instance to be a case of a particular disease.</p>
            </div>
    );
};

export default PredictionComponent;
