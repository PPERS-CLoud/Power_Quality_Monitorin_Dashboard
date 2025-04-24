import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { database } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import '../css/Dashboard.css';
import PowerGraph from './PowerGraph';
import InterruptionMetrics from './InterruptionMetrics';
import PowerQualityStatus from './PowerQualityStatus';
import AnomalyMetrics from './AnomalyMetrics';
import '../css/AnomalyMetrics.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileDownload, 
  faTimes, 
  faBolt, 
  faHourglass, 
  faExclamationCircle,
  faTimesCircle 
} from '@fortawesome/free-solid-svg-icons';

const Dashboard = () => {
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const apiURL = `${import.meta.env.VITE_API_URL}`;
  const [graphType, setGraphType] = useState('power'); // Default graph type
  const [dateRange, setDateRange] = useState('day'); // Default date range
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });
  const [availableNodes, setAvailableNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('C-1'); // Default selected node
  const [startDate, setStartDate] = useState('2025-03-10'); // Default start date
  const [endDate, setEndDate] = useState('2025-03-10'); // Default end date
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(true);
  const [isLoadingDateRange, setIsLoadingDateRange] = useState(false);
  const [shouldFetchData, setShouldFetchData] = useState(false); // New state to control when to fetch data

  // Fetch available nodes from Backend API
  useEffect(() => {
    const fetchAvailableNodes = async () => {
      try {
        setIsLoadingNodes(true);
        const response = await axios.get(`${apiURL}available-nodes/`);
        const nodes = response.data.nodes || [];
        
        setAvailableNodes(nodes);
        console.log("Available nodes:", nodes);
        
        // If current selection is not available, select first available node
        if (nodes.length > 0 && !nodes.includes(selectedNode)) {
          setSelectedNode(nodes[0]);
        }
      } catch (error) {
        console.error("Error fetching available nodes from backend:", error);
        setAvailableNodes([]); // Empty array on error
      } finally {
        setIsLoadingNodes(false);
      }
    };
    
    fetchAvailableNodes();
  }, []); // Run once on component mount

  // Fetch date range for selected node
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!selectedNode) return;
      
      try {
        setIsLoadingDateRange(true);
        const response = await axios.get(`${apiURL}node-date-range/?node=${selectedNode}`);
        
        if (response.data.min_date && response.data.max_date) {
          console.log(`Date range for ${selectedNode}: ${response.data.min_date} to ${response.data.max_date}`);
          setStartDate(response.data.min_date);
          setEndDate(response.data.max_date);
        } else {
          // If the backend returns no dates, set a default date range
          console.log(`No date range found for ${selectedNode}, using default dates`);
          const today = new Date();
          const oneWeekAgo = new Date(today);
          oneWeekAgo.setDate(today.getDate() - 7);
          
          // Format as YYYY-MM-DD
          const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          setStartDate(formatDate(oneWeekAgo));
          setEndDate(formatDate(today));
        }
        
        // Signal that we should fetch data now that dates are updated
        setShouldFetchData(true);
        
      } catch (error) {
        console.error("Error fetching date range for node:", error);
        // Set fallback date range on error
        const today = new Date();
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        
        // Format as YYYY-MM-DD
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        setStartDate(formatDate(oneWeekAgo));
        setEndDate(formatDate(today));
        
        // Signal that we should fetch data with these fallback dates
        setShouldFetchData(true);
      } finally {
        setIsLoadingDateRange(false);
      }
    };
    
    fetchDateRange();
  }, [selectedNode, apiURL]); // Run when selected node changes

  // Function for backend anomaly detection
  const processAnomalies = async (rawData) => {
    try {
      // Configure your thresholds
      // Use more realistic thresholds based on your actual data
      const thresholds = {
        'voltage': {'min': 200, 'max': 240},       // Widen range
        'current': {'min': 0, 'max': 50},          // Increase max
        'power': {'min': 0, 'max': 10000},         // Increase max
        'frequency': {'min': 59.0, 'max': 61.0},   // Widen range
        'power_factor': {'min': 0.70, 'max': 1.0}  // Lower min threshold
      };
      
      console.log("Sending data to backend for anomaly detection:", rawData.length, "readings");
      
      // Send data to backend for processing
      const response = await axios.post(
        `${apiURL}anomalies/`, 
        { 
          readings: rawData,
          thresholds: thresholds
        }
      );
      
      console.log("Anomaly processing complete. Found:", 
        response.data.anomaly_count, "anomalies");
      
      return response.data.readings;
    } catch (error) {
      console.error("Error processing anomalies:", error);
      return rawData; // Return original data if backend processing fails
    }
  };

  // Separate useEffect to fetch Firebase data only when shouldFetchData is true
  useEffect(() => {
    if (!shouldFetchData) return;
    
    const fetchFirebaseData = async () => {
      setIsLoading(true);
      setReadings([]); // Clear previous readings
      
      try {
        console.log(`Fetching data for ${selectedNode} from ${startDate} to ${endDate}`);
        
        // Generate array of dates between startDate and endDate
        const dateRange = getDatesInRange(new Date(startDate), new Date(endDate));
        let allReadings = [];
        
        // Fetch data for each day in the range
        for (const date of dateRange) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          const path = `${selectedNode}/${year}/${month}/${day}`;
          console.log(`Fetching data from path: ${path}`);
          
          const nodeRef = ref(database, path);
          
          try {
            // Using a promise to handle asynchronous Firebase calls
            const snapshot = await new Promise((resolve, reject) => {
              onValue(nodeRef, resolve, (error) => {
                console.error(`Error fetching from ${path}:`, error);
                reject(error);
              }, { onlyOnce: true });
            });
            
            const data = snapshot.val();
            
            if (data) {
              console.log(`Data found at ${path}:`, data);
              
              // Convert Firebase data to readings format
              Object.keys(data).forEach(time => {
                const reading = data[time];
                allReadings.push({
                  id: `${year}-${month}-${day}-${time}`,
                  deviceId: selectedNode,
                  node: selectedNode, // Add node property for consistency with other components
                  timestamp: `${year}-${month}-${day}T${time}`,
                  voltage: reading.voltage,
                  current: reading.current,
                  power: reading.power,
                  power_factor: reading.powerFactor,
                  frequency: reading.frequency,
                  is_anomaly: reading.is_anomaly || false
                });
              });
              
              console.log(`Added ${Object.keys(data).length} readings from ${year}-${month}-${day}`);
            } else {
              console.log(`No data found at path: ${path}`);
            }
          } catch (err) {
            console.error(`Error fetching data from ${path}:`, err);
          }
        }
        
        // Sort by timestamp (newest first)
        allReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Process the data through backend anomaly detection
        if (allReadings.length > 0) {
          console.log("Processing", allReadings.length, "readings for anomalies");
          const processedData = await processAnomalies(allReadings);
          setReadings(processedData);
          
          // Set the latest reading
          setLatestReading(processedData[0]);
        } else {
          setReadings([]);
          setLatestReading(null);
          console.log(`No data found for ${selectedNode} in date range ${startDate} to ${endDate}`);
        }
        
      } catch (err) {
        console.error("Error processing Firebase data:", err);
      } finally {
        setIsLoading(false);
        // Reset the fetch flag after fetching
        setShouldFetchData(false);
      }
    };
  
    fetchFirebaseData();
    
  }, [shouldFetchData, selectedNode, startDate, endDate, apiURL]); 

  // Helper function to get all dates in a range
  const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    
    // Add one day to include the end date
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    
    while (currentDate < endDateTime) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Handler for graph type change
  const handleGraphTypeChange = (type) => {
    setGraphType(type);
  };

  // Handler for date range change
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setShouldFetchData(true); // Trigger data fetch when date changes manually
  };
  
  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setShouldFetchData(true); // Trigger data fetch when date changes manually
  };

  // Handler for node selection change
  const handleNodeChange = (e) => {
    setSelectedNode(e.target.value);
    // Date range will be updated by the useEffect that watches selectedNode
    // The subsequent data fetch will happen after date ranges are updated
  };

  // Handler for PDF download
  const handleDownloadPDF = () => {
    alert('Downloading dashboard as PDF...');
    // Implement PDF generation and download logic here
  };

  // Handler for opening modal with specific content
  const openModal = (title, content) => {
    setModalContent({ title, content });
    setShowModal(true);
  };

  // Handler for closing modal
  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="dashboard-container">
      {/* Combined Header and Date Selection Row */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2 className="dashboard-title">Power Monitoring Dashboard</h2>
        </div>
        
        <div className="header-right">
          <div className="selector-container">
            {/* Updated Node Selection Dropdown */}
            <div className="node-selector">
              <div className="node-label">Node:</div>
              <select 
                className="node-dropdown"
                value={selectedNode}
                onChange={handleNodeChange}
                disabled={isLoadingNodes}
              >
                {isLoadingNodes ? (
                  <option value="">Loading nodes...</option>
                ) : availableNodes.length > 0 ? (
                  availableNodes.map(node => (
                    <option key={node} value={node}>{node}</option>
                  ))
                ) : (
                  <option value="">No nodes available</option>
                )}
              </select>
            </div>
            
            {/* Date Range Selector with loading state */}
            <div className="date-range-selector">
              <div className="date-range-label">
                Date Range:
                {isLoadingDateRange && (
                  <span className="loading-indicator"> (Loading...)</span>
                )}
              </div>
              <div className="date-range-inputs">
                <input 
                  type="date" 
                  className="date-picker" 
                  name="start-date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  disabled={isLoadingDateRange}
                />
                <span className="date-separator">-</span>
                <input 
                  type="date" 
                  className="date-picker" 
                  name="end-date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  disabled={isLoadingDateRange}
                />
              </div>
            </div>
          </div>
          
          <button className="download-button" onClick={handleDownloadPDF}>
            <FontAwesomeIcon icon={faFileDownload} /> Download as PDF
          </button>
        </div>
      </div>

      {/* Rest of your component remains unchanged */}
      <div className="dashboard-content">
        <div className="metric-cards-row">
          <PowerQualityStatus
            readings={readings}
            latestReading={latestReading}
            thresholds={{
              voltage: { 
                min: 210, 
                max: 230, 
                ideal: { min: 218, max: 222 }
              },
              frequency: { 
                min: 59.5, 
                max: 60.5, 
                ideal: { min: 59.9, max: 60.1 }
              },
              powerFactor: { 
                min: 0.85, 
                ideal: 0.95
              }
            }}
            method="combined"
            onModalOpen={openModal}
          />
          
          <InterruptionMetrics 
            readings={readings}
            voltageThreshold={218}
            minDurationSec={30}
            onModalOpen={openModal}
          />
          
          <AnomalyMetrics
            readings={readings}
            onModalOpen={openModal}
          />
        </div>
        
        <div className="graph-row">
          <div className="graph-card">
            <div className="graph-header">
              <h3>
                {graphType === 'powerFactor' 
                    ? 'Power Factor Over Time'
                    : graphType.charAt(0).toUpperCase() + graphType.slice(1) + ' Over Time'} 
                <span className="selected-node">- Node {selectedNode}</span>
              </h3>            
              <div className="graph-controls">
                <button 
                  className={`graph-type-button ${graphType === 'voltage' ? 'active' : ''}`} 
                  onClick={() => handleGraphTypeChange('voltage')}
                >
                  Voltage
                </button>
                <button 
                  className={`graph-type-button ${graphType === 'current' ? 'active' : ''}`} 
                  onClick={() => handleGraphTypeChange('current')}
                >
                  Current
                </button>
                <button 
                  className={`graph-type-button ${graphType === 'power' ? 'active' : ''}`} 
                  onClick={() => handleGraphTypeChange('power')}
                >
                  Power
                </button>
                <button 
                  className={`graph-type-button ${graphType === 'frequency' ? 'active' : ''}`} 
                  onClick={() => handleGraphTypeChange('frequency')}
                >
                  Frequency
                </button>
                <button 
                  className={`graph-type-button ${graphType === 'powerFactor' ? 'active' : ''}`} 
                  onClick={() => handleGraphTypeChange('powerFactor')}
                >
                  Power Factor
                </button>
              </div>
            </div>
            
            <div className="graph-content">
              {isLoading ? (
                <div className="graph-placeholder">
                  <div className="graph-message">
                    <p>Loading data...</p>
                  </div>
                </div>
              ) : readings.length > 0 ? (
                <PowerGraph 
                  readings={readings} 
                  graphType={graphType} 
                  selectedNode={selectedNode} 
                />
              ) : (
                <div className="graph-placeholder">
                  <div className="graph-message">
                    <p>No data available for {selectedNode} on selected date range.</p>
                    <p>Please select a different node or date range.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalContent.title}</h3>
              <button className="close-modal" onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p>{modalContent.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;