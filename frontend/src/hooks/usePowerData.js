import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  fetchAvailableNodes,
  fetchNodeDateRange
} from '../services/dataService';
import {
  processAnomalies,
  sampleDataForDisplay,
  formatDateString
} from '../services/dataProcessingService';

const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      console.error("Error formatting date for display:", e);
      return dateString; // Return original on error
    }
  };
  
export const usePowerData = () => {
  // State variables for dashboard data
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  
  // Nodes and date selection
  const [availableNodes, setAvailableNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nodeMinDate, setNodeMinDate] = useState(null);
  const [nodeMaxDate, setNodeMaxDate] = useState(null);
  const [nodeDateRangeInfo, setNodeDateRangeInfo] = useState(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(true);
  const [isLoadingDateRange, setIsLoadingDateRange] = useState(false);
  const [dataLoadProgress, setDataLoadProgress] = useState(0);
  
  // Progressive loading states
  const [currentLoadingDate, setCurrentLoadingDate] = useState(null);
  const [totalDays, setTotalDays] = useState(0);
  const [daysLoaded, setDaysLoaded] = useState(0);
  const allReadingsRef = useRef([]);
  const isFetchingRef = useRef(false);
  
  // Data processing states
  const [isProcessingAnomalies, setIsProcessingAnomalies] = useState(false);
  const [anomalyProgress, setAnomalyProgress] = useState(0);

  // Fetch available nodes on component mount
  useEffect(() => {
    const loadAvailableNodes = async () => {
      setIsLoadingNodes(true);
      try {
        const nodes = await fetchAvailableNodes();
        console.log("Available nodes:", nodes);
        
        if (nodes && nodes.length > 0) {
          setAvailableNodes(nodes);
          
          // Set default selected node if not already set
          if (!selectedNode) {
            setSelectedNode(nodes[0]);
          }
        }
      } catch (error) {
        console.error("Error loading available nodes:", error);
        // Fallback data for testing
        setAvailableNodes(['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7']);
      } finally {
        setIsLoadingNodes(false);
      }
    };
    
    loadAvailableNodes();
  }, []);

  // Fetch node date range when node changes
  useEffect(() => {
    if (!selectedNode) return;
    
    const fetchNodeDates = async () => {
      setIsLoadingDateRange(true);
      setNodeMinDate(null);
      setNodeMaxDate(null);
      setNodeDateRangeInfo(null);
      // Also clear readings when node changes
      setReadings([]);
      allReadingsRef.current = [];
      
      try {
        console.log(`Fetching date range for node ${selectedNode}`);
        const dateRange = await fetchNodeDateRange(selectedNode);
        
        if (dateRange && dateRange.min_date && dateRange.max_date) {
          // Prepare all state updates first
          const newMinDate = dateRange.min_date;
          const newMaxDate = dateRange.max_date;
          
          // Update all date-related states
          setNodeMinDate(newMinDate);
          setNodeMaxDate(newMaxDate);
          setStartDate(newMinDate); // Use min date as start 
          setEndDate(newMaxDate);   // Use max date as end
          
          setNodeDateRangeInfo({
            minDate: newMinDate,
            maxDate: newMaxDate,
            formattedMin: formatDateForDisplay(newMinDate),
            formattedMax: formatDateForDisplay(newMaxDate)
          });
          
          console.log(`Node ${selectedNode} date range: ${newMinDate} to ${newMaxDate}`);
        } else {
          console.warn(`No date range available for node ${selectedNode}`);
          // Clear dates if no range found
          setStartDate('');
          setEndDate('');
        }
      } catch (error) {
        console.error("Error fetching node date range:", error);
        // Clear dates on error
        setStartDate('');
        setEndDate('');
      } finally {
        setIsLoadingDateRange(false);
      }
    };
    
    fetchNodeDates();
  }, [selectedNode]);

  // Load dashboard data progressively when node or date range changes
  useEffect(() => {
    if (!selectedNode || !startDate || !endDate || !nodeMinDate || !nodeMaxDate) return;
    if (isLoadingDateRange) return; // Don't start if still loading date range
    
    const loadDashboardDataProgressively = async () => {
      if (isFetchingRef.current) return; // Prevent multiple fetches
      
      // Force a check of startDate against nodeMinDate
      if (startDate < nodeMinDate) {
        console.warn(`Start date (${startDate}) is before node's minimum date (${nodeMinDate}). Adjusting...`);
        setStartDate(nodeMinDate);
        return; // Exit and let the next effect cycle handle it with correct dates
      }
      
      if (endDate > nodeMaxDate) {
        console.warn(`End date (${endDate}) is after node's maximum date (${nodeMaxDate}). Adjusting...`);
        setEndDate(nodeMaxDate);
        return; // Exit and let the next effect cycle handle it
      }
      
      setIsLoading(true);
      setDataLoadProgress(0);
      setReadings([]);
      allReadingsRef.current = [];
      isFetchingRef.current = true;
      
      try {
        console.log(`Loading dashboard data for ${selectedNode} from ${startDate} to ${endDate}`);
        
        // Calculate date range as an array of dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dateRange = [];
        let currentDate = new Date(start);
        
        while (currentDate <= end) {
          dateRange.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setTotalDays(dateRange.length);
        setDaysLoaded(0);
        
        // Process each day one by one
        for (let i = 0; i < dateRange.length; i++) {
          const date = dateRange[i];
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          setCurrentLoadingDate(`${year}-${month}-${day}`);
          
          // Fetch data for this specific day
          try {
            const formattedDate = `${year}-${month}-${day}`;
            console.log(`Fetching data for ${selectedNode} on ${formattedDate}`);
            
            // Fetch data for single day
            const dailyData = await fetchDailyData(selectedNode, year, month, day);
            
            // Process anomalies for this batch
            const processedData = processAnomalies(dailyData);
            
            // Add to cumulative data
            allReadingsRef.current = [...allReadingsRef.current, ...processedData];
            
            // Update progress
            const newDaysLoaded = i + 1;
            setDaysLoaded(newDaysLoaded);
            const progress = Math.round((newDaysLoaded / dateRange.length) * 100);
            setDataLoadProgress(progress);
            
            // Update readings with current cumulative data
            // We may want to sample if there's a lot of data
            const sampledData = sampleDataForDisplay(allReadingsRef.current, dateRange.length);
            setReadings(sampledData);
            
            // Find and set latest reading
            if (sampledData.length > 0) {
              const latestByTime = [...sampledData].sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
              )[0];
              setLatestReading(latestByTime);
            }
            
            // Add a small delay between fetches to prevent overwhelming the API
            if (i < dateRange.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (dayError) {
            console.error(`Error fetching data for ${year}-${month}-${day}:`, dayError);
            // Continue with next day even if this one fails
          }
        }
        
        console.log(`Completed loading all data: ${allReadingsRef.current.length} readings`);
        
        // Process anomalies in background if needed
        if (allReadingsRef.current.length > 0) {
          setIsProcessingAnomalies(true);
          
          // Simulate background processing with time delays
          setTimeout(() => {
            setAnomalyProgress(50);
            
            setTimeout(() => {
              setAnomalyProgress(100);
              setIsProcessingAnomalies(false);
            }, 1500);
          }, 1000);
        }
      } catch (error) {
        console.error("Error in progressive data loading:", error);
      } finally {
        setIsLoading(false);
        setDataLoadProgress(100);
        isFetchingRef.current = false;
      }
    };
    
    loadDashboardDataProgressively();
  }, [selectedNode, startDate, endDate, nodeMinDate, nodeMaxDate, isLoadingDateRange]);

  // Function to fetch daily data
  const fetchDailyData = async (node, year, month, day) => {
    try {
      // Use your existing API endpoint for fetching data for a specific day
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/'}firebase/node-data/`, {
        params: {
          node,
          year,
          month,
          day
        }
      });
      
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching data for ${year}-${month}-${day}:`, error);
      return [];
    }
  };

  // Handler for node selection change
  const handleNodeChange = (e) => {
    const newNode = e.target.value;
    
    // Clear all data immediately
    setIsLoading(true);
    setIsLoadingDateRange(true);
    setReadings([]);
    allReadingsRef.current = [];
    setDataLoadProgress(0);
    isFetchingRef.current = false; // Reset fetching flag
    
    // Set the new node
    setSelectedNode(newNode);
  };
  
  // Handler for date range change
  const handleStartDateChange = (e) => {
    // Validate against node min date
    const selectedDate = e.target.value;
    if (nodeMinDate && selectedDate < nodeMinDate) {
      alert(`Selected date is before the earliest available data (${nodeMinDate})`);
      setStartDate(nodeMinDate);
    } else {
      setStartDate(selectedDate);
    }
  };
  
  const handleEndDateChange = (e) => {
    // Validate against node max date
    const selectedDate = e.target.value;
    if (nodeMaxDate && selectedDate > nodeMaxDate) {
      alert(`Selected date is after the latest available data (${nodeMaxDate})`);
      setEndDate(nodeMaxDate);
    } else {
      setEndDate(selectedDate);
    }
  };

  return {
    readings,
    latestReading,
    availableNodes,
    selectedNode,
    startDate,
    endDate,
    nodeMinDate,
    nodeMaxDate,
    nodeDateRangeInfo,
    isLoading,
    isLoadingNodes,
    isLoadingDateRange,
    dataLoadProgress,
    isProcessingAnomalies,
    anomalyProgress,
    currentLoadingDate,
    totalDays,
    daysLoaded,
    handleNodeChange,
    handleStartDateChange,
    handleEndDateChange
  };
};