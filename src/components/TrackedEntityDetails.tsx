import React, { useState, useRef, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useDataQuery } from "@dhis2/app-runtime";
import {
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableColumnHeader,
  CircularLoader,
  Button,
} from "@dhis2/ui";
import PredictionComponent from "./PredictionProcessor";
import Sidebar from "./SideBar";
import HotspotProcessor from "./HotSpotData";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import L from "leaflet";
import FetchOrgUnitData from "./orgunitcoordinates";
import * as turf from '@turf/turf';
import * as d3 from 'd3';
import './TrackedEntityDetails.css';

// Ensure the icon path is correctly set for Leaflet markers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

interface RouteParams {
  trackerEntityId: string;
  orgUnitId: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DataElementMetadata {
  id: string;
  displayName: string;
}

interface Attribute {
  attribute: string;
  displayName: string;
  value: string;
}

interface DataValue {
  dataElement: string;
  value: string;
}

interface Event {
  eventDate: string;
  dataValues: DataValue[];
}

interface Enrollment {
  orgUnit: string;
  orgUnitName: string;
  events: Event[];
  attributes: Attribute[];
}

interface TrackedEntity {
  trackedEntityInstance: string;
  enrollments: Enrollment[];
  created: string;
  attributes: Attribute[];
  orgUnitName: string;
  orgUnit: string;
  coordinates?: [number, number];
}

const QUERY = {
  trackedEntities: {
    resource: "trackedEntityInstances",
    id: ({ trackerEntityId }: any) => trackerEntityId,
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
  dataElements: {
    resource: "dataElements",
    params: {
      fields: ["id", "displayName"],
      paging: "false",
    },
  },
};

const TrackedEntityDetails = () => {
  const { trackerEntityId } = useParams<RouteParams>();
  const history = useHistory();
  const { loading, error, data } = useDataQuery(QUERY, {
    variables: { trackerEntityId: trackerEntityId },
  });

  // Type assertion for API data
  const apiData = data as any;
  const orgUnitId = apiData?.trackedEntities?.enrollments?.[0]?.orgUnit || null;

  // EXISTING STATE
  const [entity, setEntity] = useState<TrackedEntity | null>(null);
  const [orgUnitCoordinates, setOrgUnitCoordinates] = useState<Coordinates>({
    latitude: 0,
    longitude: 0,
  });
  const [trackedEntityCoordinates, setTrackedEntityCoordinates] =
    useState<Coordinates>({ latitude: 0, longitude: 0 });
  const [orgUnitName, setOrgUnitName] = useState<string>("N/A");
  const [events, setEvents] = useState<Event[]>([]);
  const [heatmapData, setHeatmapData] = useState<[number, number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [dataElementsMetadata, setDataElementsMetadata] = useState<DataElementMetadata[]>([]);

  // ADMINISTRATIVE BOUNDARIES STATE
  const [districts, setDistricts] = useState<any>(null);
  const [parishes, setParishes] = useState<any>(null);
  const [patientDistrict, setPatientDistrict] = useState<string>('');
  const [patientCounty, setPatientCounty] = useState<string>('');
  const [patientSubCounty, setPatientSubCounty] = useState<string>('');
  const [patientParish, setPatientParish] = useState<string>('');
  const [patientVillage, setPatientVillage] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  // NEW STATE FOR ADDITIONAL COMPONENTS
  const [baselineData, setBaselineData] = useState<any[]>([]);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);

  // LineChart Component
  const LineChart = ({ data }: { data: any[] }) => {
    useEffect(() => {
      if (!data || data.length === 0) return;

      const filteredData = data.filter(d => d.weight !== null || d.bmi !== null || d.muac !== null);
      const svgWidth = 500;
      const svgHeight = 300;
      const margin = { top: 20, right: 30, bottom: 60, left: 50 };

      // Clear any existing SVG
      d3.select("#line-chart").select("svg").remove();

      const svg = d3.select("#line-chart")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

      const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
        .range([margin.left, svgWidth - margin.right]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => Math.max(d.weight || 0, d.bmi || 0, d.muac || 0)) || 0])
        .range([svgHeight - margin.bottom, margin.top]);

      // Create axes
      const xAxis = d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%Y-%m-%d") as any);
      const yAxis = d3.axisLeft(y);

      svg.append("g")
        .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "10px")
        .style("text-anchor", "middle");

      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "10px");

      // Line generators
      const lineWeight = d3.line<any>()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.weight))
        .defined(d => d.weight !== null);
      
      const lineBMI = d3.line<any>()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.bmi))
        .defined(d => d.bmi !== null);
      
      const lineMUAC = d3.line<any>()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.muac))
        .defined(d => d.muac !== null);

      // Append lines
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", lineWeight);

      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("d", lineBMI);
      
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", lineMUAC);

      // Add circles for data points
      data.forEach(d => {
        if (d.weight !== null) {
          svg.append("circle")
            .attr("cx", x(new Date(d.date)))
            .attr("cy", y(d.weight))
            .attr("r", 3)
            .attr("fill", "steelblue");
        }

        if (d.bmi !== null) {
          svg.append("circle")
            .attr("cx", x(new Date(d.date)))
            .attr("cy", y(d.bmi))
            .attr("r", 3)
            .attr("fill", "orange");
        }

        if (d.muac !== null) {
          svg.append("circle")
            .attr("cx", x(new Date(d.date)))
            .attr("cy", y(d.muac))
            .attr("r", 3)
            .attr("fill", "green");
        }
      });

      // Legend
      const legend = svg.append("g")
        .attr("transform", `translate(${svgWidth / 2 - 75}, ${svgHeight - 15})`);

      legend.append("rect").attr("x", -60).attr("y", 0).attr("width", 8).attr("height", 8).attr("fill", "steelblue");
      legend.append("text").attr("x", -48).attr("y", 8).text("Weight").attr("fill", "steelblue").style("font-size", "10px");
      
      legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 8).attr("height", 8).attr("fill", "orange");
      legend.append("text").attr("x", 12).attr("y", 8).text("BMI").attr("fill", "orange").style("font-size", "10px");
      
      legend.append("rect").attr("x", 50).attr("y", 0).attr("width", 8).attr("height", 8).attr("fill", "green");
      legend.append("text").attr("x", 62).attr("y", 8).text("MUAC").attr("fill", "green").style("font-size", "10px");

    }, [data]);

    return <div id="line-chart" className="chart-container"></div>;
  };

  // All your existing useEffect hooks remain the same...
  // (I'm keeping the existing useEffect code as it is for brevity)

  // GEOJSON LOADING
 useEffect(() => {
  const fetchDistrictsGeoJSON = async () => {
    try {
      const districtsPath = `${process.env.PUBLIC_URL || ''}/Districts_UG.geojson`;
      console.log('Loading districts GeoJSON from:', districtsPath);
      
      const response = await fetch(districtsPath);
      if (!response.ok) {
        throw new Error(`Failed to load districts GeoJSON: ${response.status} ${response.statusText}`);
      }
      const districtGeoJsonData = await response.json();
      setDistricts(districtGeoJsonData);
      console.log('Districts loaded:', districtGeoJsonData);
    } catch (error) {
      console.error('Error fetching district GeoJSON:', error);
    }
  };

  const fetchParishesGeoJSON = async () => {
    try {
      const parishesPath = `${process.env.PUBLIC_URL || ''}/Ug_Parishes_2016.geojson`;
      console.log('Loading parishes GeoJSON from:', parishesPath);
      
      const response = await fetch(parishesPath);
      if (!response.ok) {
        throw new Error(`Failed to load parishes GeoJSON: ${response.status} ${response.statusText}`);
      }
      const parishesGeoJsonData = await response.json();
      setParishes(parishesGeoJsonData);
      console.log('Parishes loaded:', parishesGeoJsonData);
    } catch (error) {
      console.error('Error fetching parish GeoJSON:', error);
    }
  };

  fetchDistrictsGeoJSON();
  fetchParishesGeoJSON();
}, []);

  // ENTITY DATA LOADING
  useEffect(() => {
    if (apiData?.trackedEntities) {
      const entityData = apiData.trackedEntities as TrackedEntity;
      setEntity(entityData);
      console.log("Entity data:", entityData);

      // Extract org unit data
      const orgUnitId = entityData.enrollments?.[0]?.orgUnit;
      console.log("orgUnitId:", orgUnitId);
      const orgUnitName = entityData.enrollments?.[0]?.orgUnitName || "N/A";
      setOrgUnitName(orgUnitName);

      // Extract coordinates from attributes
      const attributes = entityData.attributes || [];
      const gisCoordinatesAttr = attributes.find(
        (attr: Attribute) => attr.displayName === "GIS Coordinates"
      );
      const gisCoordinates = gisCoordinatesAttr
        ? JSON.parse(gisCoordinatesAttr.value.replace(/'/g, '"'))
        : [0, 0];
      console.log("GIS Coordinates: ", gisCoordinates);
      setTrackedEntityCoordinates({
        latitude: gisCoordinates[0],
        longitude: gisCoordinates[1],
      });

      // Extract events and their data elements
      const eventsData = entityData.enrollments?.[0]?.events || [];
      setEvents(eventsData);
    }
  }, [apiData]);

  // BASELINE DATA EXTRACTION
  useEffect(() => {
    if (entity && entity.enrollments && entity.enrollments.length > 0) {
      const enrollment = entity.enrollments[0];
      if (enrollment.events && enrollment.events.length > 0) {
        const firstEvent = enrollment.events[0];
        const baselineEntries: any[] = [];
        firstEvent.dataValues.forEach((dataValue: DataValue) => {
          const displayName = getDataElementDisplayName(dataValue.dataElement);

          if (displayName && displayName.toLowerCase().includes('baseline')) {
            baselineEntries.push({
              dataElement: displayName,
              value: dataValue.value,
            });
          }
        });
        console.log('Baseline entries found:', baselineEntries);
        setBaselineData(baselineEntries);
      }
    }
  }, [entity, dataElementsMetadata]);

  // WEIGHT, BMI, MUAC DATA EXTRACTION
  useEffect(() => {
    if (entity && entity.enrollments && entity.enrollments.length > 0) {
      const enrollment = entity.enrollments[0];
      if (enrollment.events && enrollment.events.length > 0) {
        const weightData: any[] = [];
        const bmiData: any[] = [];
        const muacData: any[] = [];

        enrollment.events.forEach((event: Event) => {
          event.dataValues.forEach((dataValue: DataValue) => {
            const displayName = getDataElementDisplayName(dataValue.dataElement);

            if (displayName) {
              if (displayName.toLowerCase().includes('weight')) {
                weightData.push({
                  date: event.eventDate,
                  value: parseFloat(dataValue.value)
                });
              } else if (displayName.toLowerCase().includes('bmi')) {
                bmiData.push({
                  date: event.eventDate,
                  value: parseFloat(dataValue.value)
                });
              } else if (displayName.toLowerCase().includes('muac')) {
                muacData.push({
                  date: event.eventDate,
                  value: parseFloat(dataValue.value)
                });
              }
            }
          });
        });

        const combined = weightData.map((w, index) => ({
          date: w.date,
          weight: w.value,
          bmi: bmiData[index]?.value || null,
          muac: muacData[index]?.value || null
        }));

        setCombinedData(combined);
        console.log('Combined data for line chart:', combined);
      }
    }
  }, [entity, dataElementsMetadata]);

  // TEST RESULTS EXTRACTION
  useEffect(() => {
    if (entity && entity.enrollments && entity.enrollments.length > 0) {
      const enrollment = entity.enrollments[0];
      if (enrollment.events && enrollment.events.length > 0) {
        const results: any[] = [];
        const types: any[] = [];

        enrollment.events.forEach((event: Event) => {
          event.dataValues.forEach((dataValue: DataValue) => {
            if (dataValue.dataElement === 'WTz4HSqoE5E') {
              results.push({
                eventDate: event.eventDate,
                result: dataValue.value,
              });
            } else if (dataValue.dataElement === 't1wRW4bpRrj') {
              types.push({
                eventDate: event.eventDate,
                type: dataValue.value,
              });
            }
          });
        });

        setTestResults(results);
        setTestTypes(types);
      }
    }
  }, [entity]);

  // PATIENT LOCATION CHECK
  useEffect(() => {
    const checkPatientLocation = () => {
      if (trackedEntityCoordinates.latitude !== 0 && 
          trackedEntityCoordinates.longitude !== 0 && 
          parishes) {
        
        console.log('=== PATIENT LOCATION DEBUG ===');
        console.log('Patient coordinates stored:', trackedEntityCoordinates);
        
        const point1 = turf.point([trackedEntityCoordinates.longitude, trackedEntityCoordinates.latitude]);
        const point2 = turf.point([trackedEntityCoordinates.latitude, trackedEntityCoordinates.longitude]);
        
        let foundDistrict = '';
        let foundCounty = '';
        let foundSubCounty = '';
        let foundParish = '';
        let foundVillage = '';
        let foundWithPoint1 = false;
        
        if (parishes.features) {
          for (const feature of parishes.features) {
            if (turf.booleanPointInPolygon(point1, feature.geometry)) {
              foundDistrict = feature.properties.D || '';
              foundCounty = feature.properties.C || '';
              foundSubCounty = feature.properties.S || '';
              foundParish = feature.properties.P || '';
              foundVillage = feature.properties.V || '';
              foundWithPoint1 = true;
              break;
            }
          }
          
          if (!foundWithPoint1) {
            for (const feature of parishes.features) {
              if (turf.booleanPointInPolygon(point2, feature.geometry)) {
                foundDistrict = feature.properties.D || '';
                foundCounty = feature.properties.C || '';
                foundSubCounty = feature.properties.S || '';
                foundParish = feature.properties.P || '';
                foundVillage = feature.properties.V || '';
                break;
              }
            }
          }
        }
        
        console.log('=== END PATIENT LOCATION DEBUG ===');
        
        setPatientDistrict(foundDistrict);
        setPatientCounty(foundCounty);
        setPatientSubCounty(foundSubCounty);
        setPatientParish(foundParish);
        setPatientVillage(foundVillage);
      }
    };

    checkPatientLocation();
  }, [trackedEntityCoordinates, parishes]);

  // DATA ELEMENTS METADATA
  useEffect(() => {
    if (apiData?.dataElements?.dataElements) {
      const metadata = apiData.dataElements.dataElements;
      setDataElementsMetadata(metadata);
      console.log("Data Elements Metadata:", metadata);
    }
  }, [apiData]);

  // HEATMAP
  useEffect(() => {
    if (heatmapData.length > 0 && mapRef.current) {
      L.heatLayer(heatmapData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.2: "blue",
          0.4: "lime",
          0.6: "yellow",
          0.8: "orange",
          1.0: "red",
        },
      }).addTo(mapRef.current);
    }
  }, [heatmapData]);

  // DISTANCE CALCULATION
  useEffect(() => {
    if (
      orgUnitCoordinates.latitude !== 0 &&
      orgUnitCoordinates.longitude !== 0 &&
      trackedEntityCoordinates.latitude !== 0 &&
      trackedEntityCoordinates.longitude !== 0
    ) {
     const orgPoint = turf.point([
      orgUnitCoordinates.longitude,
      orgUnitCoordinates.latitude
    ]);

    const patientPoint = turf.point([
      trackedEntityCoordinates.longitude,
      trackedEntityCoordinates.latitude
    ]);

      
      const turfDistance = turf.distance(orgPoint, patientPoint, { units: 'kilometers' });
      setDistance(turfDistance);
    }
  }, [orgUnitCoordinates, trackedEntityCoordinates]);

  // UTILITY FUNCTIONS
  const handlePredictionsClick = () => {
    history.push(`/Predictions`, { trackedEntity: entity });
  };

  const getDataElementDisplayName = (dataElementId: string): string => {
    const metadata = dataElementsMetadata.find((de) => de.id === dataElementId);
    return metadata ? metadata.displayName : "Unknown Data Element";
  };

  const styleDistrict = (feature: any) => {
    const isSelected = selectedDistrict === (feature.properties.name || feature.properties.NAME);
    return {
      color: '#3388ff',
      weight: 2,
      opacity: 1,
      fillOpacity: isSelected ? 0.3 : 0,
      fillColor: isSelected ? '#ff7800' : 'transparent',
    };
  };

  const styleParish = () => ({
    color: "#8475a1",
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.05,
    fillColor: "#8475a1",
  });

  // Custom patient icon
  const patientIcon = new L.Icon({
    iconUrl: process.env.PUBLIC_URL + "/patient.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
    iconSize: [38, 38],
    shadowSize: [50, 64],
    iconAnchor: [22, 94],
    shadowAnchor: [4, 62],
    popupAnchor: [0, -86],
  });

  if (loading) return <CircularLoader />;
  if (error) return <p>Error: {error.message}</p>;
  if (!entity) return <p>Loading entity data...</p>;

  return (
    <div>
      <div className="layout">
        <Sidebar selectedEntity={entity} />
        <div className="dashboard-container">
          {/* HEADER SECTION */}

          {/* HEADER SECTION WITH NAVIGATION */}
          <div className="dashboard-header">
            {/* Navigation Buttons */}
            <div className="navigation-buttons">
              <Button
                onClick={() => history.push("/TrackerDataTable")}
                secondary
                className="nav-button"
              >
                ← Back to Tracker Table
              </Button>
              <Button
                onClick={() => window.location.reload()}
                secondary
                className="nav-button"
              >
                🔄 Refresh
              </Button>
              <Button
                onClick={handlePredictionsClick}
                primary
                className="nav-button"
              >
                🎯 View Predictions
              </Button>
            </div>

            {/* Title Section */}
            <div className="header-title-section">
              <h2 className="dashboard-title">Patient's Dashboard</h2>
              <p className="dashboard-subtitle">
                Comprehensive health monitoring and analysis
              </p>
            </div>
          </div>

          {/*  ESSENTIAL INFORMATION AND PATIENT ATTRIBUTES - SIDE BY SIDE */}
          <div className="essential-patient-container">
            <div className="essential-info-section">
              <h3>📋 Essential Information</h3>
              <div className="essential-info-cards">
                <div className="essential-info-card">
                  <h6>Organization Unit</h6>
                  <p>{orgUnitName}</p>
                </div>
                <div className="essential-info-card">
                  <h6>Registration Date</h6>
                  <p>{new Date(entity.created).toLocaleDateString()}</p>
                </div>
                <div className="essential-info-card">
                  <h6>Patient ID</h6>
                  <p>{trackerEntityId}</p>
                </div>
                <div className="essential-info-card">
                  <h6>Status</h6>
                  <p style={{ color: "#27ae60" }}>Active</p>
                </div>
              </div>
            </div>

            <div className="patient-attributes-section">
              <h3>👤 Patient Attributes</h3>

              {/* Patient Names in Horizontal Cards */}
              <div className="patient-names-horizontal">
                {entity.attributes
                  .filter(
                    (attr: Attribute) =>
                      attr.displayName !== "GIS Coordinates" &&
                      (attr.displayName.toLowerCase().includes("name") ||
                        attr.displayName.toLowerCase().includes("given") ||
                        attr.displayName.toLowerCase().includes("Sex") ||
                        attr.displayName.toLowerCase().includes("gender") ||
                      attr.displayName.includes("NTLP-04: Sex"))
                  )
                  .map((attr: Attribute, index: number) => (
                    <div key={attr.attribute} className="patient-name-card">
                      <h6>{attr.displayName}</h6>
                      <p>{attr.value}</p>
                    </div>
                  ))}
              </div>

              {/* Other Attributes in Horizontal Cards */}
              <div className="patient-names-horizontal">
                {entity.attributes
                  .filter(
                    (attr: Attribute) =>
                      attr.displayName !== "GIS Coordinates" &&
                      !attr.displayName.toLowerCase().includes("name") &&
                      !attr.displayName.toLowerCase().includes("given") &&
                      !attr.displayName.toLowerCase().includes("Sex") &&
                      !attr.displayName.toLowerCase().includes("gender") &&
                      !attr.displayName.includes("NTLP-04: Sex")
                  )
                  .map((attr: Attribute, index: number) => (
                    <div key={attr.attribute} className="patient-name-card">
                      <h6>{attr.displayName}</h6>
                      <p>{attr.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          {/* ADMINISTRATIVE LOCATION HIERARCHY */}
          {(patientDistrict ||
            patientCounty ||
            patientSubCounty ||
            patientParish ||
            patientVillage) && (
            <div className="section-card">
              <h3 style={{ color: "#2c3e50", marginBottom: "15px" }}>
                📍 Administrative Location Hierarchy
              </h3>
              <div className="admin-location-grid">
                <div className="admin-box district-box">
                  <strong style={{ color: "#1976d2" }}>District</strong>
                  <br />
                  <span>{patientDistrict || "Not found"}</span>
                </div>
                <div className="admin-box county-box">
                  <strong style={{ color: "#2e7d32" }}>County</strong>
                  <br />
                  <span>{patientCounty || "Not found"}</span>
                </div>
                <div className="admin-box subcounty-box">
                  <strong style={{ color: "#f57c00" }}>Sub-County</strong>
                  <br />
                  <span>{patientSubCounty || "Not found"}</span>
                </div>
                <div className="admin-box parish-box">
                  <strong style={{ color: "#7b1fa2" }}>Parish</strong>
                  <br />
                  <span>{patientParish || "Not found"}</span>
                </div>
                <div className="admin-box village-box">
                  <strong style={{ color: "#c62828" }}>Village</strong>
                  <br />
                  <span>{patientVillage || "Not found"}</span>
                </div>
              </div>
            </div>
          )}
          {/* PREDICTION COMPONENT */}
          <div style={{ marginBottom: "30px" }}>
            <PredictionComponent trackedEntityId={trackerEntityId} />
          </div>
          {/* BASELINE DATA AND WEIGHT MONITORING - SIDE BY SIDE */}
          <div className="side-by-side-container">
            <div className="baseline-table-container">
              <h5 className="table-header">📋 Baseline Data</h5>
              <div className="table-content">
                {baselineData.length > 0 ? (
                  <DataTable className="baseline-table">
                    <DataTableHead>
                      <DataTableRow>
                        <DataTableColumnHeader>
                          Data Element
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>Value</DataTableColumnHeader>
                      </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                      {baselineData.map((item: any, index: number) => (
                        <DataTableRow key={index}>
                          <DataTableCell>{item.dataElement}</DataTableCell>
                          <DataTableCell>{item.value}</DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                ) : (
                  <p className="no-data-message">No baseline data found.</p>
                )}
              </div>
            </div>

            <div className="weight-chart-container">
              <h5 className="chart-header">📈 Weight Monitoring per Visit</h5>
              <div className="chart-content">
                {combinedData.length > 0 ? (
                  <LineChart data={combinedData} />
                ) : (
                  <p className="no-data-message">
                    No weight monitoring data available.
                  </p>
                )}
              </div>
            </div>
          </div>
          {/* FOLLOW-UP TEST RESULTS SECTION */}
          <div className="test-results-container">
            <div className="test-results-content">
              <h5 className="test-results-title">🧪 Follow-Up Test Results</h5>
              {testResults.length > 0 ? (
                <div className="table-scroll">
                  <DataTable>
                    <DataTableHead>
                      <DataTableRow>
                        <DataTableColumnHeader>
                          Clinic Visit
                        </DataTableColumnHeader>
                        {testResults.map((result: any, index: number) => (
                          <DataTableColumnHeader key={index}>
                            {`Visit ${index + 1} (${new Date(
                              result.eventDate
                            ).toLocaleDateString()})`}
                          </DataTableColumnHeader>
                        ))}
                      </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                      <DataTableRow>
                        <DataTableCell>
                          <strong>Test Result</strong>
                        </DataTableCell>
                        {testResults.map((result: any, index: number) => (
                          <DataTableCell key={index}>
                            {result.result}
                          </DataTableCell>
                        ))}
                      </DataTableRow>
                      <DataTableRow>
                        <DataTableCell>
                          <strong>Type of Test</strong>
                        </DataTableCell>
                        {testResults.map((result: any, index: number) => (
                          <DataTableCell key={index}>
                            {testTypes[index]?.type || "N/A"}
                          </DataTableCell>
                        ))}
                      </DataTableRow>
                    </DataTableBody>
                  </DataTable>
                </div>
              ) : (
                <p className="no-data-message">
                  No follow-up test results found.
                </p>
              )}
            </div>
          </div>
          {/* HOTSPOT PROCESSOR */}
          <HotspotProcessor setHeatmapData={setHeatmapData} />
          <FetchOrgUnitData
            orgUnitId={orgUnitId}
            onCoordinatesFetched={(coordinates) =>
              setOrgUnitCoordinates({
                latitude: coordinates[1],
                longitude: coordinates[0],
              })
            }
          />
          {/* MAP AND LOCATION DETAILS - SIDE BY SIDE */}
          <div className="map-location-container">
            <div className="map-container">
              <div className="map-content">
                <h5
                  style={{
                    color: "#2c3e50",
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  🗺️ Interactive Location Map
                </h5>
                <div style={{ position: "relative" }}>
                  <MapContainer
                    center={[
                      
                      trackedEntityCoordinates.longitude,
                      trackedEntityCoordinates.latitude,
                    ]}
                    zoom={13}
                    style={{
                      height: "500px",
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                    attributionControl={true}
                    whenCreated={(mapInstance) => {
                      mapRef.current = mapInstance;
                    }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {/* DISTRICT BOUNDARIES */}
                    {districts && (
                      <GeoJSON
                        data={districts}
                        style={styleDistrict}
                        onEachFeature={(feature, layer) => {
                          layer.on({
                            click: () => {
                              setSelectedDistrict(
                                feature.properties.name ||
                                  feature.properties.NAME ||
                                  ""
                              );
                            },
                          });
                          layer.bindPopup(
                            `<strong>District:</strong> ${
                              feature.properties.name ||
                              feature.properties.NAME ||
                              "Unknown"
                            }`
                          );
                        }}
                      />
                    )}

                    {/* PARISH BOUNDARIES */}
                    {parishes && (
                      <GeoJSON
                        data={parishes}
                        style={styleParish}
                        onEachFeature={(feature, layer) => {
                          const districtName =
                            feature.properties.DNAME_2010 || "Unknown";
                          const countyName =
                            feature.properties.CNAME_2010 || "Unknown";
                          const subCountyName =
                            feature.properties.SCNAME_201 || "Unknown";
                          const parishName =
                            feature.properties.PNAME_2010 || "Unknown";
                          const villageName = feature.properties.V || "Unknown";

                          layer.bindPopup(`
                            <div style="min-width: 200px;">
                              <h6><strong>Administrative Info</strong></h6>
                              <strong>District:</strong> ${districtName}<br/>
                              <strong>County:</strong> ${countyName}<br/>
                              <strong>Sub-County:</strong> ${subCountyName}<br/>
                              <strong>Parish:</strong> ${parishName}<br/>
                              <strong>Village:</strong> ${villageName}
                            </div>
                          `);
                        }}
                      />
                    )}

                    {/* ORGANIZATION UNIT MARKER */}
                    {orgUnitCoordinates.latitude !== 0 &&
                      orgUnitCoordinates.longitude !== 0 && (
                        <Marker
                          position={[
                            orgUnitCoordinates.latitude,
                            orgUnitCoordinates.longitude,
                          ]}
                        >
                          <Popup>
                            <strong>Organization Unit:</strong> {orgUnitName}
                            <br />
                            <strong>Type:</strong> Health Facility
                          </Popup>
                        </Marker>
                      )}

                    {/* PATIENT MARKER */}
                    <Marker
                      position={[
                        trackedEntityCoordinates.longitude,
                        trackedEntityCoordinates.latitude,
                      ]}
                      icon={patientIcon}
                    >
                      <Popup>
                        <div style={{ minWidth: "250px" }}>
                          <h6>
                            <strong>Patient Information</strong>
                          </h6>
                          <strong>Patient ID:</strong> {trackerEntityId}
                          <br />
                          <hr />
                          <h6>
                            <strong>Administrative Location</strong>
                          </h6>
                          <strong>District:</strong>{" "}
                          {patientDistrict || "Unknown"}
                          <br />
                          <strong>County:</strong> {patientCounty || "Unknown"}
                          <br />
                          <strong>Sub-County:</strong>{" "}
                          {patientSubCounty || "Unknown"}
                          <br />
                          <strong>Parish:</strong> {patientParish || "Unknown"}
                          <br />
                          <strong>Village:</strong>{" "}
                          {patientVillage || "Unknown"}
                          <br />
                          {distance && (
                            <>
                              <hr />
                              <strong>Distance to Health Facility:</strong>{" "}
                              {distance.toFixed(2)} km
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>

                  {/* MAP LEGEND */}
                  <div className="map-legend">
                    <h6 className="legend-title">Map Legend</h6>
                    <div>
                      <div className="legend-item">
                        <span
                          className="legend-symbol"
                          style={{ color: "#3388ff", fontWeight: "bold" }}
                        >
                          ━━━
                        </span>
                        District Boundaries
                      </div>
                      <div className="legend-item">
                        <span
                          className="legend-symbol"
                          style={{ color: "#8475a1", fontWeight: "bold" }}
                        >
                          ━━━
                        </span>
                        Parish Boundaries
                      </div>
                      <div className="legend-item">
                        <span
                          className="legend-symbol"
                          style={{ color: "red" }}
                        >
                          🔴
                        </span>
                        Disease Hotspots
                      </div>
                      <div className="legend-item">
                        <span className="legend-symbol">🏥</span>
                        Health Facility
                      </div>
                      <div className="legend-item">
                        <span className="legend-symbol">👤</span>
                        Patient Location
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LOCATION DETAILS SIDE PANEL */}
            <div className="location-details-container">
              <div className="location-content">
                <h5
                  style={{
                    color: "#2c3e50",
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  📍 Location & Distance Summary
                </h5>

                {/* Distance Highlight */}
                {distance !== null && (
                  <div className="distance-highlight">
                    <h6 style={{ color: "#2e7d32", marginBottom: "10px" }}>
                      Distance to Health Facility
                    </h6>
                    <span className="distance-value">
                      {distance.toFixed(2)} km
                    </span>
                  </div>
                )}

                {/* Patient Location Details */}
                <div className="location-section">
                  <h6 className="location-section-title">Patient Location</h6>
                  <div className="location-detail">
                    <strong>District:</strong>
                    <span style={{ color: "#1976d2" }}>
                      {patientDistrict || "Not identified"}
                    </span>
                  </div>
                  <div className="location-detail">
                    <strong>County:</strong>
                    <span style={{ color: "#2e7d32" }}>
                      {patientCounty || "Not identified"}
                    </span>
                  </div>
                  <div className="location-detail">
                    <strong>Sub-County:</strong>
                    <span style={{ color: "#f57c00" }}>
                      {patientSubCounty || "Not identified"}
                    </span>
                  </div>
                  <div className="location-detail">
                    <strong>Parish:</strong>
                    <span style={{ color: "#7b1fa2" }}>
                      {patientParish || "Not identified"}
                    </span>
                  </div>
                  <div className="location-detail">
                    <strong>Village:</strong>
                    <span style={{ color: "#c62828" }}>
                      {patientVillage || "Not identified"}
                    </span>
                  </div>
                </div>

                {/* Health Facility Details */}
                <div className="location-section">
                  <h6 className="location-section-title">Health Facility</h6>
                  <div className="location-detail">
                    <strong>Facility:</strong>
                    <span style={{ color: "#34495e" }}>{orgUnitName}</span>
                  </div>
                  <div className="location-detail">
                    <strong>Type:</strong>
                    <span style={{ color: "#34495e" }}>
                      TB Treatment Center
                    </span>
                  </div>
                </div>

                {/* Coordinates */}
                <div>
                  <h6 className="location-section-title">Coordinates</h6>
                  <div className="coordinates-text">
                    <p style={{ margin: "5px 0" }}>
                      <strong>Latitude:</strong>{" "}
                      {trackedEntityCoordinates.latitude.toFixed(6)}
                    </p>
                    <p style={{ margin: "5px 0" }}>
                      <strong>Longitude:</strong>{" "}
                      {trackedEntityCoordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* ACTION BUTTONS */}
          <div className="action-buttons">
            <Button
              onClick={handlePredictionsClick}
              primary
              className="prediction-button"
            >
              View Detailed Predictions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackedEntityDetails;