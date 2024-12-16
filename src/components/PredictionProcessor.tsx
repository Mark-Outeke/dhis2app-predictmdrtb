import React, { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Doughnut } from 'react-chartjs-2'; // Import Doughnut chart component
import { Chart, registerables } from 'chart.js'; // Import Chart and registerables
import * as d3 from 'd3';

Chart.register(...registerables); // Register all necessary chart components

interface PredictionComponentProps {}

interface FeatureContribution {
  featureId: string;
  contribution: number;
}

interface TrackedEntityData {
  enrollments: any[];
}

const PredictionComponent: React.FC<PredictionComponentProps> = () => {
  const [predictions, setPredictions] = useState<number[]>([]);
  const [featureContributions, setFeatureContributions] = useState<FeatureContribution[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Track if predictions are running
  const [hasRunPredictions, setHasRunPredictions] = useState<boolean>(false); // Track if predictions have been made
  const [averagePrediction, setAveragePrediction] = useState<number[]>([]);
  const [highestAveragePrediction, setHighestAveragePrediction] = useState<number[]>([]);
  const [predictedClass, setPredictedClass] = useState<string>('');
  const [dataElementDisplayNames, setDataElementDisplayNames] = useState<Record<string, string>>({}); // Mapping of IDs to display names
  const [reverseDataElementDisplayNames, setReverseDataElementDisplayNames] = useState<Record<string, string>>({}); // New state for reverse mapping
  const [error, setError] = useState<string | null>(null);
  const [featureAttributions, setFeatureAttributions] = useState<any[]>([]); 
  const [mappedIGValues, setMappedIGValues] = useState<any[]>([]);
  const [finalAveragedIGValues, setFinalAVerageIGValues] = useState<any[]>([]);
  const [isDisplayNamesFetched, setIsDisplayNamesFetched] = useState<boolean>(false); // Track if display names have been fetched

  const silenceWarnings = (...args: any[]) => {};

  useEffect(() => {
    silenceWarnings(predictions, averagePrediction);
  }, [predictions, averagePrediction]);

  useEffect(() => {
    const fetchDataElementDisplayNames = async () => {
      if (!trackedEntityData) return;
      try {
        const response = await tracker.legacy.GetDataElementsNameByID({ 
          paging: false
        });
        const dataElements = response.data.dataElements;

        if (!Array.isArray(dataElements)) {
          throw new Error('Expected dataElements to be an array');
        }

        const displayNameMapping: Record<string, string> = {};
        const reverseDisplayNameMapping: Record<string, string> = {}; // New mapping for reverse lookup
        dataElements.forEach((element: { id: string; displayName: string }) => {
          displayNameMapping[element.id] = element.displayName;
          reverseDisplayNameMapping[element.displayName] = element.id; // Populate reverse mapping
        });

        setDataElementDisplayNames(displayNameMapping);
        setReverseDataElementDisplayNames(reverseDisplayNameMapping); // Set reverse mapping in state
        setIsDisplayNamesFetched(true);
      } catch (error) {
        console.error('Error fetching data element display names:', error);
        setError('Failed to fetch data element display names');
      }
    };

    fetchDataElementDisplayNames();
  }, [trackedEntityData]);

  // ... (Continue transforming the rest of the code with similar TypeScript adjustments)

  return (
    // Your JSX markup goes here
  );
};

export default PredictionComponent;
