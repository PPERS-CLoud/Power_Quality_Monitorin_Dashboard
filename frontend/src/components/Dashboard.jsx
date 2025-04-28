import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { database } from '../services/firebase';
import { ref, onValue, get } from 'firebase/database';
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
  faExclamationTriangle,
  faTimesCircle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';


/**
 * Power Monitoring Dashboard
 * --------------------------
 * This dashboard visualizes and analyzes power quality metrics from multiple collection nodes.
 * 
 * ADAPTIVE SAMPLING STRATEGY
 * -------------------------
 * The system implements multi-level adaptive sampling to handle large datasets efficiently:
 * 
 * 1. Initial Data Loading:
 *    - Very large datasets (>500,000 points): 1:rate sampling to target ~5,000 points (day resolution)
 *    - Large datasets (>100,000 points): 1:rate sampling to target ~10,000 points (hour resolution)
 *    - Medium datasets (>20,000 points): 1:rate sampling to target ~15,000 points (minute resolution)
 *    - Small datasets (≤20,000 points): No sampling (raw resolution)
 * 
 * 2. Intelligent Preservation:
 *    - All anomalous data points are preserved regardless of sampling rate
 *    - Only regular (non-anomalous) readings are downsampled
 *    - Results are chronologically sorted after sampling
 * 
 * 3. Visualization Sampling (in PowerGraph):
 *    - Extra-large sets (>10,000 points): Further sampled to ~500 points
 *    - Large sets (>1,000 points): Further sampled to ~1,000 points
 * 
 * ANOMALY DETECTION THRESHOLDS
 * ---------------------------
 * Parameters are considered anomalous when outside these ranges:
 * 
 * | Parameter     | Minimum Value | Maximum Value |
 * |---------------|--------------|---------------|
 * | Voltage       | 218.51 V     | 241.49 V      |
 * | Current       | 0 A          | 50 A          |
 * | Power         | 0 W          | 10,000 W      |
 * | Frequency     | 59.5 Hz      | 60.5 Hz       |
 * | Power Factor  | 0.8          | 1.0           |
 * 
 * POWER QUALITY EVALUATION CRITERIA
 * -------------------------------
 * Quality is evaluated using three-tier classification:
 * 
 * 1. Excellent Quality (All parameters within ideal ranges):
 *    - Voltage: 220V - 240V
 *    - Frequency: 59.8Hz - 60.2Hz
 *    - Power Factor: ≥ 0.95
 * 
 * 2. Good Quality (All parameters within acceptable ranges):
 *    - Voltage: 218.51V - 241.49V
 *    - Frequency: 59.5Hz - 60.5Hz
 *    - Power Factor: ≥ 0.8
 * 
 * 3. Poor Quality (One or more parameters outside acceptable ranges)
 * 
 * INTERRUPTION DETECTION ALGORITHM
 * ------------------------------
 * Power interruptions are detected using the following criteria:
 * 
 * - Definition: Any period where voltage drops below 180V
 * - Minimum duration: 30 seconds (shorter drops are ignored)
 * - Detection process:
 *   1. Readings are sorted chronologically
 *   2. System scans for voltage drops below threshold
 *   3. Tracks start and end times of each interruption
 *   4. Calculates duration and flags ongoing interruptions
 *   5. Reports average interruption duration and total count
 * 
 * ANOMALY SEVERITY CALCULATION
 * --------------------------
 * Severity is determined by the percentage of anomalous readings:
 * 
 * - None: 0% of readings are anomalous
 * - Low: <5% of readings are anomalous
 * - Medium: 5-15% of readings are anomalous
 * - High: >15% of readings are anomalous
 * 
 * The system also provides parameter-specific anomaly counts for:
 * voltage, current, power, frequency, and power factor.
 */

const Dashboard = () => {
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const apiURL = `${import.meta.env.VITE_API_URL}`;
  const [graphType, setGraphType] = useState('power'); // Default graph type
  const [dateRange, setDateRange] = useState('day'); // Default date range
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });
  const [availableNodes, setAvailableNodes] = useState(['C-1', 'C-18']); // Default nodes for fallback
  const [selectedNode, setSelectedNode] = useState('C-1'); // Default selected node
  const [startDate, setStartDate] = useState('2025-03-10'); // Default start date
  const [endDate, setEndDate] = useState('2025-03-18'); // Default end date
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(true);
  const [isLoadingDateRange, setIsLoadingDateRange] = useState(false);
  const [shouldFetchData, setShouldFetchData] = useState(true); // Start with true to fetch data on load
  
  // Data handling and efficiency states
  const [actualResolution, setActualResolution] = useState('minute'); // The resolution actually used
  const [dataLoadProgress, setDataLoadProgress] = useState(0); 
  const [loadedDays, setLoadedDays] = useState([]);
  const [dataCache, setDataCache] = useState({}); // Cache for fetched data
  
  // Background processing states
  const [isProcessingAnomalies, setIsProcessingAnomalies] = useState(false);
  const [anomalyProgress, setAnomalyProgress] = useState(0);
  const anomalyProcessRef = useRef(null);
  
  // Use a ref for data cache to prevent dependency issues
  const dataCacheRef = useRef({});
  // Track if a fetch is in progress to prevent loops
  const isFetchInProgressRef = useRef(false);
  // Track the raw readings for background processing
  const rawReadingsRef = useRef([]);

  // Helper function to get all dates in a range
  const getDatesInRange = useCallback((startDate, endDate) => {
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
  }, []);

  // Calculate sampling rate based on data range
  const calculateSamplingRate = useCallback((start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dayDiff = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
    
    // Estimate readings count (assuming 86400 readings per day - one per second)
    const estimatedReadings = dayDiff * 86400;
    
    // Determine appropriate sampling rate based on total volume
    if (estimatedReadings > 500000) {
      return { rate: Math.ceil(estimatedReadings / 5000), mode: 'day' };
    } else if (estimatedReadings > 100000) {
      return { rate: Math.ceil(estimatedReadings / 10000), mode: 'hour' };
    } else if (estimatedReadings > 20000) {
      return { rate: Math.ceil(estimatedReadings / 15000), mode: 'minute' };
    } else {
      return { rate: 1, mode: 'raw' };
    }
  }, []);

  // Determine date range warning
  const getDateRangeWarning = useCallback(() => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateDiff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      if (dateDiff > 30) {
        return "Long date range detected. Data will be sampled for better performance.";
      } else if (dateDiff > 7) {
        return "Wide date range detected. Some data points may be sampled for performance.";
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [startDate, endDate]);

  // Sample data to reduce volume while preserving patterns
  const sampleData = useCallback((data, samplingRate) => {
    if (!data || data.length === 0 || samplingRate <= 1) return data;
    
    console.log(`Sampling data with rate 1:${samplingRate}`);
    
    // Keep all anomalies and sample only regular readings
    const anomalies = data.filter(item => item.is_anomaly);
    const regularReadings = data.filter(item => !item.is_anomaly);
    
    // Apply sampling to regular readings only
    const sampledRegularReadings = regularReadings.filter((_, index) => index % samplingRate === 0);
    
    console.log(`Preserved ${anomalies.length} anomalies, sampled ${sampledRegularReadings.length} regular readings from ${regularReadings.length} total`);
    
    // Combine anomalies with sampled regular readings and sort chronologically
    return [...anomalies, ...sampledRegularReadings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }, []);

  // Get cache key for a day's data - no dependencies needed
  const getCacheKey = useCallback((node, year, month, day) => {
    return `${node}_${year}_${month}_${day}`;
  }, []);

  // Check if data is in cache - using ref instead of state to avoid dependency issues
  const checkCache = useCallback((node, year, month, day) => {
    const key = getCacheKey(node, year, month, day);
    return dataCacheRef.current[key];
  }, [getCacheKey]);

  // Add data to cache - update both state and ref
  const addToCache = useCallback((node, year, month, day, data) => {
    const key = getCacheKey(node, year, month, day);
    
    // Update the ref directly (no re-render)
    dataCacheRef.current[key] = data;
    
    // Update the state as well (for component updates)
    setDataCache(prev => {
      const newCache = { ...prev };
      newCache[key] = data;
      return newCache;
    });
  }, [getCacheKey]);

  // Function to format dates for Firebase paths
  const formatDateForPath = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return { year, month, day, formatted: `${year}-${month}-${day}` };
  }, []);

  // Sync dataCache state with ref when it changes
  useEffect(() => {
    dataCacheRef.current = dataCache;
  }, [dataCache]);

  // Process data through backend for anomaly detection
  const processAnomalies = useCallback(async (rawData) => {
    if (!rawData || rawData.length === 0) return [];
    
    // Anomaly Thresholds for different parameters
    try {
      const thresholds = {
        'voltage': {'min': 218.51, 'max': 241.49},
        'current': {'min': 0, 'max': 50},
        'power': {'min': 0, 'max': 10000},
        'frequency': {'min': 59.5, 'max': 60.5},
        'power_factor': {'min': 0.8, 'max': 1.0}
      };
      
      console.log("Sending data to backend for anomaly detection:", rawData.length, "readings");
      
      // Send data in batches if too large
      if (rawData.length > 25000) {
        console.log("Data too large, processing in batches");
        
        const batchSize = 20000;
        const batches = Math.ceil(rawData.length / batchSize);
        let processedData = [];
        
        for (let i = 0; i < batches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, rawData.length);
          const batch = rawData.slice(start, end);
          
          console.log(`Processing batch ${i+1}/${batches}: ${batch.length} readings`);
          
          try {
            const response = await axios.post(
              `${apiURL}anomalies/`, 
              { 
                readings: batch,
                thresholds: thresholds
              }
            );
            
            processedData = [...processedData, ...response.data.readings];
            console.log(`Batch ${i+1} complete. Found ${response.data.anomaly_count} anomalies`);
          } catch (error) {
            console.error(`Error processing batch ${i+1}:`, error);
            // If backend processing fails, maintain any existing anomaly information
            processedData = [...processedData, ...batch.map(reading => ({
              ...reading,
              is_anomaly: reading.is_anomaly || false,
              anomaly_parameters: reading.anomaly_parameters || []
            }))];
          }
        }
        
        return processedData;
      } else {
        // Regular processing for smaller datasets
        const response = await axios.post(
          `${apiURL}anomalies/`, 
          { readings: rawData, thresholds: thresholds }
        );
        
        console.log("Anomaly processing complete. Found:", 
          response.data.anomaly_count, "anomalies");
        
        return response.data.readings;
      }
    } catch (error) {
      console.error("Error processing anomalies:", error);
      // If backend processing fails completely, maintain any existing anomaly information
      return rawData.map(reading => ({
        ...reading,
        is_anomaly: reading.is_anomaly || false,
        anomaly_parameters: reading.anomaly_parameters || []
      }));
    }
  }, [apiURL]);

  // Fetch available nodes with fallback to direct Firebase if backend fails
  useEffect(() => {
    const fetchAvailableNodes = async () => {
      try {
        setIsLoadingNodes(true);
        
        // Define a complete list of nodes for fallback
        const allKnownNodes = [
          'C-1', 'C-2', 'C-3', 'C-4', 'C-6', 'C-7', 'C-8', 'C-9',
        ];
        
        try {
          // First try to get from backend API - FIXED URL PATH
          const response = await axios.get(`${apiURL}firebase/nodes/`);
          console.log("API response:", response);
          const nodes = response.data || [];
          
          if (nodes.length > 0) {
            console.log("Available nodes from backend API:", nodes);
            setAvailableNodes(nodes);
            
            if (!nodes.includes(selectedNode)) {
              setSelectedNode(nodes[0]);
            }
            return;
          }
        } catch (backendError) {
          console.error("Error fetching nodes from backend:", backendError);
          console.warn("Falling back to direct Firebase access");
        }
        
        // Fallback: Try to get nodes directly from Firebase using shallow query
        try {
          console.log("Attempting shallow query to get Firebase node keys");
          // Use shallow parameter to get only the keys
          const dbRef = ref(database);
          const snapshot = await get(dbRef, { shallow: true });
          
          if (snapshot.exists()) {
            const nodes = Object.keys(snapshot.val())
              .filter(key => key.startsWith('C-'))
              .sort((a, b) => {
                // Sort numerically by the number after 'C-'
                const numA = parseInt(a.split('-')[1]);
                const numB = parseInt(b.split('-')[1]);
                return numA - numB;
              });
            
            console.log("Available nodes from Firebase:", nodes);
            if (nodes.length > 0) {
              setAvailableNodes(nodes);
              
              if (!nodes.includes(selectedNode)) {
                setSelectedNode(nodes[0]);
              }
              return;
            }
          }
        } catch (firebaseError) {
          console.error("Error fetching nodes from Firebase:", firebaseError);
          console.log("Using complete list of known nodes");
        }
        
        // If both methods fail, use the complete list of known nodes
        console.log("Using complete list of known nodes as fallback");
        setAvailableNodes(allKnownNodes);
        
        // If current selected node isn't in the list, select the first one
        if (!allKnownNodes.includes(selectedNode)) {
          setSelectedNode(allKnownNodes[0]);
        }
        
      } finally {
        setIsLoadingNodes(false);
      }
    };
    
    fetchAvailableNodes();
  }, [selectedNode]); // Include selectedNode as dependency

  // Fetch date range with fallback values for selected node
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!selectedNode) return;
      
      try {
        setIsLoadingDateRange(true);
        
        // Try to get from backend API with the correct URL
        try {
          const response = await axios.get(`${apiURL}firebase/date-range/?node=${selectedNode}`);
          
          if (response.data.min_date && response.data.max_date) {
            console.log(`Date range for ${selectedNode}: ${response.data.min_date} to ${response.data.max_date}`);
            setStartDate(response.data.min_date);
            setEndDate(response.data.max_date);
            setShouldFetchData(true);
            return;
          }
        } catch (error) {
          console.error("Error fetching date range for node:", error);
        }
        
        // Rest of the existing code remains the same
        // Node-specific defaults based on our knowledge
        if (selectedNode === 'C-1') {
          setStartDate('2025-03-10');
          setEndDate('2025-03-18');
        } else if (selectedNode === 'C-18') {
          setStartDate('2025-04-17');
          setEndDate('2025-04-24');
        } else {
          // Generic fallback
          const today = new Date();
          const oneWeekAgo = new Date(today);
          oneWeekAgo.setDate(today.getDate() - 7);
          
          const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          setStartDate(formatDate(oneWeekAgo));
          setEndDate(formatDate(today));
        }
        
        // Signal that we should fetch data with these fallback dates
        setShouldFetchData(true);
        
      } finally {
        setIsLoadingDateRange(false);
      }
    };
    
    fetchDateRange();
  }, [selectedNode, apiURL]);

  // Cleanup function for background processes
  useEffect(() => {
    return () => {
      if (anomalyProcessRef.current) {
        clearTimeout(anomalyProcessRef.current);
      }
    };
  }, []);

  // Main data fetching function with optimized asynchronous anomaly detection
  useEffect(() => {
    // Skip if we shouldn't fetch data or if a fetch is already in progress
    if (!shouldFetchData || isFetchInProgressRef.current) return;
    
    const fetchFirebaseData = async () => {
      // Cancel any ongoing background processes
      if (anomalyProcessRef.current) {
        clearTimeout(anomalyProcessRef.current);
        anomalyProcessRef.current = null;
      }
      
      isFetchInProgressRef.current = true; // Mark fetch as in progress
      setIsLoading(true);
      setReadings([]); // Clear previous readings
      setDataLoadProgress(0);
      setAnomalyProgress(0);
      setIsProcessingAnomalies(false);
      
      try {
        console.log(`Fetching data for ${selectedNode} from ${startDate} to ${endDate}`);
        
        // Generate array of dates between startDate and endDate
        const dateRange = getDatesInRange(new Date(startDate), new Date(endDate));
        setLoadedDays([]); // Reset loaded days
        
        // Always use automatic calculation based on date range
        const calculated = calculateSamplingRate(startDate, endDate);
        const rate = calculated.rate;
        const mode = calculated.mode;
        
        console.log(`Using auto-calculated resolution: 1:${rate}, mode: ${mode}`);
        setActualResolution(mode);
        
        // Prepare for efficient loading
        let allReadings = [];
        const totalDays = dateRange.length;
        
        // Function to fetch data for a single day
        const fetchDayData = async (date) => {
          const { year, month, day, formatted } = formatDateForPath(date);
          const path = `${selectedNode}/${year}/${month}/${day}`;
          
          // Check cache first
          const cachedData = checkCache(selectedNode, year, month, day);
          if (cachedData) {
            console.log(`Using cached data for ${path}`);
            return cachedData;
          }
          
          try {
            console.log(`Fetching data from path: ${path}`);
            const nodeRef = ref(database, path);
            
            const snapshot = await get(nodeRef);
            const data = snapshot.val();
            
            if (data) {
              // Convert Firebase data to readings format
              const dayReadings = Object.keys(data).map(time => ({
                id: `${formatted}-${time}`,
                deviceId: selectedNode,
                node: selectedNode,
                timestamp: `${formatted}T${time}`,
                voltage: data[time].voltage,
                current: data[time].current,
                power: data[time].power,
                power_factor: data[time].powerFactor,
                frequency: data[time].frequency,
                is_anomaly: data[time].is_anomaly || false
              }));
              
              // Store in cache
              addToCache(selectedNode, year, month, day, dayReadings);
              
              console.log(`Loaded ${dayReadings.length} readings from ${formatted}`);
              return dayReadings;
            }
          } catch (err) {
            console.error(`Error fetching data from ${path}:`, err);
          }
          
          return []; // Return empty array if no data
        };
        
        // Process days in batches for better UI responsiveness
        const batchSize = 3; // Fetch 3 days at a time
        const batches = Math.ceil(totalDays / batchSize);
        
        // ------------------- STAGE 1: FETCH DATA -------------------
        console.log("STAGE 1: Fetching raw data");
        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
          const start = batchIndex * batchSize;
          const end = Math.min(start + batchSize, totalDays);
          const batchDates = dateRange.slice(start, end);
          
          setDataLoadProgress(Math.min(40, ((batchIndex + 1) * batchSize / totalDays) * 40));
          
          // Fetch all days in this batch concurrently
          const batchResults = await Promise.all(
            batchDates.map(date => fetchDayData(date))
          );
          
          // Process the batch results
          const batchReadings = batchResults.flat();
          allReadings = [...allReadings, ...batchReadings];
          
          // Update loaded days for progress tracking
          const newLoadedDays = batchDates.map(date => formatDateForPath(date).formatted);
          setLoadedDays(prev => [...prev, ...newLoadedDays]);
        }
        
        // Store raw readings in ref for background processing
        rawReadingsRef.current = allReadings;
        
        // If no data was found, exit early
        if (allReadings.length === 0) {
          console.log(`No data found for ${selectedNode} in date range ${startDate} to ${endDate}`);
          setReadings([]);
          setLatestReading(null);
          setDataLoadProgress(100);
          isFetchInProgressRef.current = false;
          return;
        }
        
        // ------------------- STAGE 2: APPLY INITIAL SAMPLING -------------------
        // Apply initial sampling without anomaly detection to display data quickly
        console.log("STAGE 2: Initial sampling before anomaly detection");
        setDataLoadProgress(60);
        
        // Apply simple sampling based on selected or calculated resolution
        const initialSampledData = sampleData(allReadings, rate);
        
        // Set data for immediate display
        setReadings(initialSampledData);
        setIsLoading(false);
        setDataLoadProgress(100);
        
        // Set latest reading based on timestamp
        if (initialSampledData.length > 0) {
          const latestByTime = [...initialSampledData].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          )[0];
          setLatestReading(latestByTime);
        }
        
        // Mark main fetch as complete so UI is responsive
        isFetchInProgressRef.current = false;
        
        // ------------------- STAGE 3: START BACKGROUND ANOMALY DETECTION -------------------
        setIsProcessingAnomalies(true);
        setAnomalyProgress(0);
        
        // Start anomaly detection in the background after a short delay
        anomalyProcessRef.current = setTimeout(async () => {
          try {
            console.log("BACKGROUND TASK: Starting anomaly detection on raw data");
            
            // Process anomalies on raw data in background
            const anomalyChunkSize = 20000;
            const anomalyBatches = Math.ceil(allReadings.length / anomalyChunkSize);
            let anomalyFlags = new Map(); // Store anomaly info by reading ID
            
            for (let i = 0; i < anomalyBatches; i++) {
              const start = i * anomalyChunkSize;
              const end = Math.min(start + anomalyChunkSize, allReadings.length);
              const chunk = allReadings.slice(start, end);
              
              setAnomalyProgress(Math.round(((i + 1) / anomalyBatches) * 100));
              console.log(`Processing anomalies batch ${i+1}/${anomalyBatches}: ${chunk.length} readings`);
              
              try {
                // Process this chunk for anomalies
                const processedChunk = await processAnomalies(chunk);
                
                // Store which readings are anomalies in our map
                processedChunk.forEach(reading => {
                  if (reading.is_anomaly) {
                    anomalyFlags.set(reading.id, {
                      is_anomaly: true,
                      anomaly_parameters: reading.anomaly_parameters || []
                    });
                  }
                });
                
                // Update UI with partial results after each batch or every other batch
                if (i % 2 === 0 || i === anomalyBatches - 1) {
                  // Get anomalies detected so far
                  const anomalies = allReadings.filter(reading => 
                    anomalyFlags.has(reading.id)
                  );
                  
                  // Get regular readings (not anomalies)
                  const regularReadings = allReadings.filter(reading => 
                    !anomalyFlags.has(reading.id)
                  );
                  
                  // Apply sampling to regular readings only
                  const sampledRegularReadings = regularReadings.filter((_, index) => 
                    index % rate === 0
                  );
                  
                  // Combine and sort chronologically
                  let updatedReadings = [...anomalies, ...sampledRegularReadings].sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                  );
                  
                  // Apply anomaly flags to all readings
                  updatedReadings = updatedReadings.map(reading => ({
                    ...reading,
                    is_anomaly: anomalyFlags.has(reading.id) || reading.is_anomaly || false,
                    anomaly_parameters: 
                      anomalyFlags.get(reading.id)?.anomaly_parameters || 
                      reading.anomaly_parameters || 
                      []
                  }));
                  
                  // Update the UI with the incrementally improved data
                  setReadings(updatedReadings);
                  
                  // Also update latest reading with anomaly status
                  if (updatedReadings.length > 0) {
                    const latestByTime = [...updatedReadings].sort(
                      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                    )[0];
                    setLatestReading(latestByTime);
                  }
                  
                  console.log(`Partial update: ${anomalies.length} anomalies found so far`);
                }
              } catch (error) {
                console.error(`Error processing anomaly batch ${i+1}:`, error);
              }
            }
            
            // ------------------- FINAL BACKGROUND UPDATE -------------------
            console.log(`Background anomaly processing complete: ${
              allReadings.filter(r => anomalyFlags.has(r.id)).length
            } anomalies found in ${allReadings.length} readings`);
            
          } catch (err) {
            console.error("Error in background anomaly processing:", err);
          } finally {
            setIsProcessingAnomalies(false);
            setAnomalyProgress(100);
            anomalyProcessRef.current = null;
          }
        }, 500); // Small delay to let the initial render complete
        
      } catch (err) {
        console.error("Error in data processing:", err);
        setIsLoading(false);
        setDataLoadProgress(100);
        isFetchInProgressRef.current = false;
      }
    };
    
    fetchFirebaseData();
    
  }, [shouldFetchData, selectedNode, startDate, endDate, calculateSamplingRate, 
      formatDateForPath, getDatesInRange, processAnomalies, sampleData, 
      checkCache, addToCache, apiURL]);

  // Handler for graph type change
  const handleGraphTypeChange = (type) => {
    setGraphType(type);
  };

  // Handler for date range change
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setShouldFetchData(true); // Trigger data fetch when date changes
  };
  
  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setShouldFetchData(true); // Trigger data fetch when date changes
  };

  // Handler for node selection change
  const handleNodeChange = (e) => {
    setSelectedNode(e.target.value);
    // Date range will be updated by the useEffect that watches selectedNode
  };

  // Handler for PDF download
  const handleDownloadPDF = () => {
    alert('Downloading dashboard as PDF...');
    // Implement PDF generation and download logic here
  };

  // Modal handlers
  const openModal = (title, content) => {
    setModalContent({ title, content });
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
  };

  // Get date range warning
  const dateRangeWarning = getDateRangeWarning();

  return (
    <div className="dashboard-container">
      {/* Header and Controls */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2 className="dashboard-title">Power Monitoring Dashboard</h2>
        </div>
        
        <div className="header-right">
          <div className="selector-container">
            {/* Node Selection */}
            <div className="node-selector">
              <div className="node-label">Node:</div>
              <select 
                className="node-dropdown"
                value={selectedNode}
                onChange={handleNodeChange}
                disabled={isLoadingNodes || isLoading}
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
            
            {/* Date Range Selector */}
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
                  disabled={isLoadingDateRange || isLoading}
                />
                <span className="date-separator">-</span>
                <input 
                  type="date" 
                  className="date-picker" 
                  name="end-date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  disabled={isLoadingDateRange || isLoading}
                />
              </div>
            </div>
          </div>
          
          <button 
            className="download-button" 
            onClick={handleDownloadPDF}
            disabled={isLoading || readings.length === 0}
          >
            <FontAwesomeIcon icon={faFileDownload} /> Download as PDF
          </button>
        </div>
      </div>

      {/* Warning and Progress Bar */}
      {dateRangeWarning && (
        <div className="date-range-warning">
          <FontAwesomeIcon icon={faExclamationTriangle} /> {dateRangeWarning}
        </div>
      )}
      
      {dataLoadProgress > 0 && dataLoadProgress < 100 && (
        <div className="data-loading-controls">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${dataLoadProgress}%` }}
            ></div>
          </div>
          <div className="progress-text">Loading data: {Math.round(dataLoadProgress)}% complete</div>
        </div>
      )}
      
      {/* Background Processing Indicator */}
      {isProcessingAnomalies && (
        <div className="background-process-indicator">
          <div className="background-process-content">
            <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
            <span>Analyzing anomalies in background: {anomalyProgress}% complete</span>
          </div>
          <div className="progress-bar-container mini">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${anomalyProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Metric Cards */}
        <div className="metric-cards-row">
        <PowerQualityStatus
          readings={readings}
          latestReading={latestReading}
          thresholds={{
            voltage: { 
              min: 218.51, 
              max: 241.49, 
              ideal: { min: 220, max: 240 }
            },
            frequency: { 
              min: 59.5, 
              max: 60.5, 
              ideal: { min: 59.8, max: 60.2 }
            },
            powerFactor: { 
              min: 0.8, 
              ideal: 0.95
            }
          }}
          method="combined"
          onModalOpen={openModal}
        />
          
          <InterruptionMetrics 
            readings={readings}
            voltageThreshold={180}
            minDurationSec={30}
            onModalOpen={openModal}
          />
          
          <AnomalyMetrics
            readings={readings}
            onModalOpen={openModal}
            isProcessing={isProcessingAnomalies}
          />
        </div>
        
        {/* Graph Section */}
        <div className="graph-row">
          <div className="graph-card">
            <div className="graph-header">
              <h3>
                {graphType === 'powerFactor' 
                    ? 'Power Factor Over Time'
                    : graphType.charAt(0).toUpperCase() + graphType.slice(1) + ' Over Time'} 
                <span className="selected-node">- Node {selectedNode}</span>
                {actualResolution && (
                  <span className="data-resolution"> ({actualResolution} resolution)</span>
                )}
                {isProcessingAnomalies && (
                  <span className="analyzing-tag"> (Analyzing anomalies...)</span>
                )}
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
                  <div className="loading-spinner-container">
                    <FontAwesomeIcon icon={faSpinner} className="spinner-icon" />
                    <p>Loading data...</p>
                    {dataLoadProgress > 0 && dataLoadProgress < 100 && (
                      <p>Progress: {Math.round(dataLoadProgress)}%</p>
                    )}
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
              {/* Replace the simple paragraph with this to preserve formatting */}
              {modalContent.content.split('\n').map((line, index) => (
                line.trim() ? 
                  <p key={index} style={{marginBottom: line.startsWith('-') ? '4px' : '12px'}}>
                    {line}
                  </p> 
                  : <br key={index} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;