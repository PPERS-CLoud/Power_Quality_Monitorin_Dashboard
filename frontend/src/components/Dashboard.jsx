import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { database } from '../services/firebase';
import { ref, onValue, query, orderByKey, limitToLast } from 'firebase/database';
import '../css/Dashboard.css';
import PowerGraph from './PowerGraph';
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
  const [selectedNode, setSelectedNode] = useState('C-1'); // Default selected node
  const [startDate, setStartDate] = useState('2025-03-10'); // Default start date
  const [endDate, setEndDate] = useState('2025-03-10'); // Default end date
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFirebaseData = async () => {
      setIsLoading(true);
      setReadings([]); // Clear previous readings
      
      try {
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
        
        setReadings(allReadings);
        
        // Set the latest reading
        if (allReadings.length > 0) {
          setLatestReading(allReadings[0]);
        } else {
          setLatestReading(null);
          console.log(`No data found for ${selectedNode} in date range ${startDate} to ${endDate}`);
        }
        
      } catch (err) {
        console.error("Error processing Firebase data:", err);
      } finally {
        setIsLoading(false);
      }
    };
  
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
  
    fetchFirebaseData();
    
    // No need for cleanup since we're using onlyOnce: true
  }, [selectedNode, startDate, endDate]);

  // Calculate metrics
  const countAnomalies = () => {
    return readings.filter(reading => reading.is_anomaly).length;
  };

  // Handler for graph type change
  const handleGraphTypeChange = (type) => {
    setGraphType(type);
  };

  // Handler for date range change
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };
  
  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  // Handler for node selection change
  const handleNodeChange = (e) => {
    setSelectedNode(e.target.value);
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
            {/* Node Selection Dropdown */}
            <div className="node-selector">
              <div className="node-label">Node:</div>
              <select 
                className="node-dropdown"
                value={selectedNode}
                onChange={handleNodeChange}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                  <option key={`C-${num}`} value={`C-${num}`}>C-{num}</option>
                ))}
              </select>
            </div>
            
            {/* Date Range Selector */}
            <div className="date-range-selector">
              <div className="date-range-label">Date Range:</div>
              <div className="date-range-inputs">
                <input 
                  type="date" 
                  className="date-picker" 
                  name="start-date"
                  value={startDate}
                  onChange={handleStartDateChange}
                />
                <span className="date-separator">-</span>
                <input 
                  type="date" 
                  className="date-picker" 
                  name="end-date"
                  value={endDate}
                  onChange={handleEndDateChange}
                />
              </div>
            </div>
          </div>
          
          <button className="download-button" onClick={handleDownloadPDF}>
            <FontAwesomeIcon icon={faFileDownload} /> Download as PDF
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">

        {/* Top row - Power quality metrics */}
        <div className="metric-cards-row">
          <div className="metric-card large bg-green">
            <h3>Power Quality Status</h3>
            <p className="metric-value">
              <span className={`status-indicator ${latestReading && latestReading.is_anomaly ? 'poor' : 'good'}`}>
                {latestReading && latestReading.is_anomaly ? 'Poor' : 'Good'}
              </span>
            </p>
            <div className="card-icon">
              <FontAwesomeIcon icon={faBolt} />
            </div>
            <div className="more-info" onClick={() => openModal("Power Quality Status", "Power quality is determined by monitoring voltage, current, and frequency levels. Good power quality ensures stable operation of electrical equipment.")}>
              More info &gt;
            </div>
          </div>
          <div className="metric-card large bg-blue">
            <h3>Average Interruption</h3>
            <p className="metric-value">2.5 <span className="unit">min</span></p>
            <div className="card-icon">
              <FontAwesomeIcon icon={faHourglass} />
            </div>
            <div className="more-info" onClick={() => openModal("Average Interruption", "The average interruption duration represents the typical length of power outages experienced. Lower values indicate better grid reliability.")}>
              More info &gt;
            </div>
          </div>
          <div className="metric-card large bg-red">
            <h3>Number of Interruptions</h3>
            <p className="metric-value">3</p>
            <div className="card-icon">
              <FontAwesomeIcon icon={faTimesCircle} />
            </div>
            <div className="more-info" onClick={() => openModal("Number of Interruptions", "This metric shows how many times the power supply has been interrupted. Frequent interruptions may indicate grid instability or equipment issues.")}>
              More info &gt;
            </div>
          </div>
          <div className="metric-card large bg-gray">
            <h3>Number of Anomalies</h3>
            <p className="metric-value">{countAnomalies()}</p>
            <div className="card-icon">
              <FontAwesomeIcon icon={faExclamationCircle} />
            </div>
            <div className="more-info" onClick={() => openModal("Number of Anomalies", "Anomalies are unusual patterns in power metrics that may indicate potential issues. Regular monitoring helps prevent equipment damage.")}>
              More info &gt;
            </div>
          </div>
        </div>
        
        {/* Bottom row - Graph */}
        <div className="graph-row">
          <div className="graph-card">
            {/* Graph header as first row */}
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
            
            {/* Graph content as second row */}
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