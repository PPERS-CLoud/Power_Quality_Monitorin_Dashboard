import { useState, useEffect, useRef } from 'react';
import { 
  fetchAvailableNodes,
  fetchYearsForNode,
  fetchMonthsForNodeYear,
  fetchDaysForNodeYearMonth,
  fetchDayData,
  fetchMonthData,
  fetchNewData
} from '../services/dataService';
import cacheService from '../services/cacheService';

export default function usePowerReadings(filters) {
  // State for readings data
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoadProgress, setDataLoadProgress] = useState(0);
  const [newDataCount, setNewDataCount] = useState(0);
  const [realtimeUpdateInProgress, setRealtimeUpdateInProgress] = useState(false);
  
  // State for hierarchy navigation
  const [availableNodes, setAvailableNodes] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Progressive loading states
  const [displayLimit, setDisplayLimit] = useState(200);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const [totalAvailableRecords, setTotalAvailableRecords] = useState(0);
  
  // Refs
  const allFetchedReadingsRef = useRef([]);
  const lastUpdateTimeRef = useRef(null);
  const isFetchInProgressRef = useRef(false);
  
  // Load available nodes on component mount
  useEffect(() => {
    const loadNodes = async () => {
      setLoading(true);
      try {
        const nodes = await fetchAvailableNodes();
        setAvailableNodes(nodes);
      } catch (err) {
        setError(`Failed to load nodes: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadNodes();
  }, []);
  
  // Load years when node changes
  useEffect(() => {
    if (!filters.node || filters.node === 'all') {
      setAvailableYears([]);
      return;
    }
    
    const loadYears = async () => {
      setLoading(true);
      try {
        const years = await fetchYearsForNode(filters.node);
        setAvailableYears(years);
        
        // Automatically select the most recent year
        if (years.length > 0) {
          setSelectedYear(years[0]);
        } else {
          setSelectedYear(null);
          setSelectedMonth(null);
          setSelectedDay(null);
        }
      } catch (err) {
        setError(`Failed to load years: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadYears();
  }, [filters.node]);
  
  // Load months when year changes
  useEffect(() => {
    if (!filters.node || !selectedYear) {
      setAvailableMonths([]);
      return;
    }
    
    const loadMonths = async () => {
      setLoading(true);
      try {
        const months = await fetchMonthsForNodeYear(filters.node, selectedYear);
        setAvailableMonths(months);
        
        // Automatically select the most recent month
        if (months.length > 0) {
          setSelectedMonth(months[0]);
        } else {
          setSelectedMonth(null);
          setSelectedDay(null);
        }
      } catch (err) {
        setError(`Failed to load months: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadMonths();
  }, [filters.node, selectedYear]);
  
  // Load days and fetch data when month changes
  useEffect(() => {
    if (!filters.node || !selectedYear || !selectedMonth) {
      setAvailableDays([]);
      return;
    }
    
    const loadDays = async () => {
      setLoading(true);
      try {
        const days = await fetchDaysForNodeYearMonth(filters.node, selectedYear, selectedMonth);
        setAvailableDays(days);
        
        // Auto select all days (no specific day)
        setSelectedDay(null);
        
        // Fetch data for the month
        await fetchDataForMonth(days);
      } catch (err) {
        setError(`Failed to load days: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadDays();
  }, [filters.node, selectedYear, selectedMonth]);
  
  // Fetch data for entire month
  const fetchDataForMonth = async (days) => {
    if (!filters.node || !selectedYear || !selectedMonth || !days || days.length === 0) {
      return;
    }
    
    if (isFetchInProgressRef.current) return;
    isFetchInProgressRef.current = true;
    
    setLoading(true);
    setDataLoadProgress(0);
    setReadings([]);
    setDisplayLimit(200);
    setIsBackgroundFetching(true);
    
    try {
      // Start fetching all data in the background
      fetchMonthData(filters.node, selectedYear, selectedMonth)
        .then(fullMonthData => {
          allFetchedReadingsRef.current = fullMonthData;
          setTotalAvailableRecords(fullMonthData.length);
          setIsBackgroundFetching(false);
          console.log(`Background fetch complete: ${fullMonthData.length} total readings available`);
        })
        .catch(err => {
          console.error("Error in background fetch:", err);
          setIsBackgroundFetching(false);
        });
      
      // Fetch initial batch for immediate display
      let initialBatchData = [];
      
      for (const day of days.slice(0, 5)) { // Try first 5 days
        const cachedData = cacheService.checkCache(filters.node, selectedYear, selectedMonth, day);
        if (cachedData) {
          initialBatchData = [...initialBatchData, ...cachedData];
          if (initialBatchData.length >= 200) break;
        } else {
          const dayData = await fetchDayData(filters.node, selectedYear, selectedMonth, day);
          initialBatchData = [...initialBatchData, ...dayData];
          if (initialBatchData.length >= 200) break;
        }
      }
      
      // Get initial data and sort
      const initialData = initialBatchData.slice(0, 200);
      initialData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setReadings(initialData);
      console.log(`Loaded initial ${initialData.length} readings for immediate display`);
    } catch (err) {
      console.error("Error in data processing:", err);
      setError(`Failed to load readings data: ${err.message}`);
      setIsBackgroundFetching(false);
    } finally {
      setLoading(false);
      setDataLoadProgress(100);
      isFetchInProgressRef.current = false;
    }
  };
  
  // Fetch data for specific day
  const fetchDay = async (day) => {
    if (!filters.node || !selectedYear || !selectedMonth) return;
    
    setLoading(true);
    setSelectedDay(day);
    setDisplayLimit(200);
    
    try {
      const dayData = await fetchDayData(filters.node, selectedYear, selectedMonth, day);
      allFetchedReadingsRef.current = dayData;
      setTotalAvailableRecords(dayData.length);
      
      setReadings(dayData.slice(0, 200));
      setIsBackgroundFetching(false);
    } catch (err) {
      console.error(`Error fetching day data:`, err);
      setError(`Failed to load day data: ${err.message}`);
      setReadings([]);
      setIsBackgroundFetching(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch latest data manually
  const fetchLatestData = async () => {
    if (!filters.node || filters.node === 'all' || !selectedYear || !selectedMonth) {
      console.log('Cannot fetch latest data without node, year, and month selection');
      return;
    }
    
    setRealtimeUpdateInProgress(true);
    
    try {
      // Get most recent timestamp in current data
      let latestTimestamp = null;
      if (readings.length > 0) {
        latestTimestamp = readings.reduce((max, reading) => {
          return reading.timestamp > max ? reading.timestamp : max;
        }, "");
        console.log(`Latest timestamp in current data: ${latestTimestamp}`);
      }
      
      // Determine which day to fetch for
      let day;
      const today = new Date();
      const currentYear = today.getFullYear().toString();
      const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
      const currentDay = today.getDate().toString().padStart(2, '0');
      
      if (selectedYear === currentYear && selectedMonth === currentMonth) {
        day = currentDay;
      } else {
        day = availableDays[0]; // most recent day
      }
      
      // Fetch only new data
      const newReadings = await fetchNewData(
        filters.node, 
        selectedYear, 
        selectedMonth, 
        day, 
        latestTimestamp
      );
      
      if (newReadings.length > 0) {
        // Mark new readings
        const markedReadings = newReadings.map(r => ({...r, isNew: true}));
        
        // Update cache
        cacheService.addToCache(filters.node, selectedYear, selectedMonth, day, [
          ...cacheService.checkCache(filters.node, selectedYear, selectedMonth, day) || [],
          ...markedReadings
        ]);
        
        // Add the new readings to the existing ones
        const updatedReadings = [...readings, ...markedReadings];
        
        // Sort by timestamp (newest first)
        updatedReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Update the readings state
        setReadings(updatedReadings);
        
        // Update notification
        setNewDataCount(markedReadings.length);
        
        // Schedule notification to disappear after 5 seconds
        setTimeout(() => {
          setNewDataCount(0);
        }, 5000);
        
        console.log(`Fetched ${markedReadings.length} new readings`);
      } else {
        console.log('No new data available');
      }
      
      // Update the last refresh time
      lastUpdateTimeRef.current = new Date();
    } catch (error) {
      console.error('Error fetching latest data:', error);
    } finally {
      setRealtimeUpdateInProgress(false);
    }
  };
  
  // Load more data
  const loadMoreData = () => {
    if (allFetchedReadingsRef.current.length <= displayLimit) {
      return; // No more data to load
    }
    
    const newLimit = displayLimit + 200;
    setDisplayLimit(newLimit);
    
    const moreData = allFetchedReadingsRef.current.slice(0, newLimit);
    setReadings(moreData);
    console.log(`Loaded ${newLimit} of ${allFetchedReadingsRef.current.length} total records`);
  };
  
  return {
    // Data
    readings,
    loading,
    error,
    dataLoadProgress,
    newDataCount,
    realtimeUpdateInProgress,
    lastUpdateTimeRef,
    
    // Navigation state
    availableNodes,
    availableYears,
    availableMonths,
    availableDays,
    selectedYear,
    selectedMonth,
    selectedDay,
    
    // Progressive loading
    displayLimit,
    isBackgroundFetching,
    totalAvailableRecords,
    
    // Actions
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay, // Add setSelectedDay to the returned values
    fetchDay,
    fetchLatestData,
    loadMoreData
  };
}