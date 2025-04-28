import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../css/PowerReadings.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, 
  faFilter, 
  faTimes, 
  faUndo, 
  faSearch,
  faSync, 
  faChevronLeft, 
  faChevronRight, 
  faCheck,
  faExclamationTriangle,
  faSpinner,
  faCalendarAlt,
  faBell
} from '@fortawesome/free-solid-svg-icons';
import { database } from '../services/firebase';
import { ref, get, onValue } from 'firebase/database';
import { throttle } from 'lodash';

// Replace direct Firebase imports with API URL
const API_URL = import.meta.env.VITE_API_URL;

const PowerReadings = () => {
    // State variables
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [availableNodes, setAvailableNodes] = useState([]);
    const [queryLimit, setQueryLimit] = useState(200);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataLoadProgress, setDataLoadProgress] = useState(0);
    const [realtimeEnabled, setRealtimeEnabled] = useState(false);
    const [newDataCount, setNewDataCount] = useState(0);
    const [realtimeUpdateInProgress, setRealtimeUpdateInProgress] = useState(false);
    const activeListenerRef = useRef(null);
    const lastUpdateTimeRef = useRef(null);
    const lastProcessedTimestampRef = useRef({}); // Add this at component level
    
    // Date structure navigation
    const [availableYears, setAvailableYears] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availableDays, setAvailableDays] = useState([]);
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    
    // Caching mechanism
    const dataCacheRef = useRef({});
    const isFetchInProgressRef = useRef(false);

    const [isThrottlingUpdates, setIsThrottlingUpdates] = useState(false);
    
    const throttledUpdateReadings = useRef(
        throttle((newReadings) => {
            setRealtimeUpdateInProgress(true);
            setReadings(newReadings);
            setTimeout(() => setRealtimeUpdateInProgress(false), 300);
        }, 1000) // Only update UI at most once per second
    ).current;

    // Filter state
    const [filters, setFilters] = useState({
        node: 'all',
        dateRange: { startDate: '', endDate: '' },
        voltage: { min: '', max: '' },
        current: { min: '', max: '' },
        power: { min: '', max: '' },
        powerFactor: { min: '', max: '' },
        frequency: { min: '', max: '' },
        anomalyOnly: false
    });
    
    const [tempFilters, setTempFilters] = useState({
        node: 'all',
        dateRange: { startDate: '', endDate: '' },
        voltage: { min: '', max: '' },
        current: { min: '', max: '' },
        power: { min: '', max: '' },
        powerFactor: { min: '', max: '' },
        frequency: { min: '', max: '' },
        anomalyOnly: false
    });
    
    // Cache helpers
    const getCacheKey = useCallback((node, year, month, day) => {
        return `${node}_${year}_${month}_${day}`;
    }, []);
    
    const checkCache = useCallback((node, year, month, day) => {
        const key = getCacheKey(node, year, month, day);
        return dataCacheRef.current[key];
    }, [getCacheKey]);
    
    const addToCache = useCallback((node, year, month, day, data) => {
        const key = getCacheKey(node, year, month, day);
        dataCacheRef.current[key] = data;
    }, [getCacheKey]);
    
    // Date format helper
    const formatDateForPath = useCallback((date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return { year, month, day, formatted: `${year}-${month}-${day}` };
    }, []);
    
    // Fetch available nodes
    useEffect(() => {
        const fetchAvailableNodes = async () => {
            try {
                setLoading(true);
                
                // Try to get nodes from backend API
                try {
                    console.log('Fetching nodes from API...');
                    const response = await axios.get(`${API_URL}firebase/nodes/`);
                    
                    if (response.data && response.data.length > 0) {
                        console.log(`Successfully found ${response.data.length} nodes:`, response.data);
                        setAvailableNodes(response.data);
                        return;
                    }
                } catch (backendError) {
                    console.error('Error fetching nodes from API:', backendError);
                    console.warn("Falling back to direct Firebase access");
                }
                
                // Fallback: Try to get nodes directly from Firebase using shallow query
                try {
                    console.log("Attempting shallow query to get Firebase node keys");
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
                            return;
                        }
                    }
                } catch (firebaseError) {
                    console.error("Error fetching nodes from Firebase:", firebaseError);
                }
                
                // If both methods fail, use a fallback list
                const fallbackNodes = ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'];
                console.log('Using fallback nodes:', fallbackNodes);
                setAvailableNodes(fallbackNodes);
                
            } finally {
                setLoading(false);
            }
        };
        
        fetchAvailableNodes();
    }, []);
    
    // When node changes, fetch available years
    useEffect(() => {
        const fetchYears = async () => {
            if (!filters.node || filters.node === 'all') {
                setAvailableYears([]);
                return;
            }
            
            setLoading(true);
            try {
                // Try to get years from Firebase
                const nodeRef = ref(database, filters.node);
                const snapshot = await get(nodeRef);
                
                if (snapshot.exists()) {
                    // Filter to include only numeric years
                    const years = Object.keys(snapshot.val())
                        .filter(year => /^\d+$/.test(year)) // Only include numeric values
                        .sort((a, b) => b - a); // Sort descending
                    
                    console.log(`Available years for ${filters.node}:`, years);
                    setAvailableYears(years);
                    
                    // Automatically select the most recent year
                    if (years.length > 0) {
                        setSelectedYear(years[0]);
                    } else {
                        setSelectedYear(null);
                        setSelectedMonth(null);
                        setSelectedDay(null);
                    }
                } else {
                    console.log(`No data found for node: ${filters.node}`);
                    setAvailableYears([]);
                    setSelectedYear(null);
                    setSelectedMonth(null);
                    setSelectedDay(null);
                }
            } catch (error) {
                console.error("Error fetching years:", error);
                setAvailableYears([]);
                setSelectedYear(null);
            } finally {
                setLoading(false);
            }
        };
        
        // Only fetch years when a specific node is selected
        if (filters.node && filters.node !== 'all') {
            fetchYears();
        }
    }, [filters.node]);
    
    // When year changes, fetch available months
    useEffect(() => {
        const fetchMonths = async () => {
            if (!filters.node || !selectedYear) {
                setAvailableMonths([]);
                return;
            }
            
            setLoading(true);
            try {
                const yearRef = ref(database, `${filters.node}/${selectedYear}`);
                const snapshot = await get(yearRef);
                
                if (snapshot.exists()) {
                    // Filter to include only numeric months
                    const months = Object.keys(snapshot.val())
                        .filter(month => /^\d+$/.test(month)) // Only include numeric values
                        .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
                    
                    console.log(`Available months for ${filters.node}/${selectedYear}:`, months);
                    setAvailableMonths(months);
                    
                    // Automatically select the most recent month
                    if (months.length > 0) {
                        setSelectedMonth(months[0]);
                    } else {
                        setSelectedMonth(null);
                        setSelectedDay(null);
                    }
                } else {
                    console.log(`No data found for ${filters.node}/${selectedYear}`);
                    setAvailableMonths([]);
                    setSelectedMonth(null);
                    setSelectedDay(null);
                }
            } catch (error) {
                console.error("Error fetching months:", error);
                setAvailableMonths([]);
                setSelectedMonth(null);
            } finally {
                setLoading(false);
            }
        };
        
        if (filters.node && selectedYear) {
            fetchMonths();
        }
    }, [filters.node, selectedYear]);
    
    // When month changes, fetch available days
    useEffect(() => {
        const fetchDays = async () => {
            if (!filters.node || !selectedYear || !selectedMonth) {
                setAvailableDays([]);
                return;
            }
            
            setLoading(true);
            try {
                const monthRef = ref(database, `${filters.node}/${selectedYear}/${selectedMonth}`);
                const snapshot = await get(monthRef);
                
                if (snapshot.exists()) {
                    // Filter to include only numeric days
                    const days = Object.keys(snapshot.val())
                        .filter(day => /^\d+$/.test(day)) // Only include numeric values
                        .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
                    
                    console.log(`Available days for ${filters.node}/${selectedYear}/${selectedMonth}:`, days);
                    setAvailableDays(days);
                    
                    // Automatically select all days for data fetching
                    setSelectedDay(null);
                    
                    // Initialize data fetching for all days in this month
                    fetchDataForMonth(days);
                } else {
                    console.log(`No data found for ${filters.node}/${selectedYear}/${selectedMonth}`);
                    setAvailableDays([]);
                    setSelectedDay(null);
                    setReadings([]);
                }
            } catch (error) {
                console.error("Error fetching days:", error);
                setAvailableDays([]);
                setSelectedDay(null);
            } finally {
                setLoading(false);
            }
        };
        
        if (filters.node && selectedYear && selectedMonth) {
            fetchDays();
        }
    }, [filters.node, selectedYear, selectedMonth]);

    const toggleRealtimeUpdates = () => {
        if (realtimeEnabled) {
            disableRealtimeUpdates();
        } else {
            enableRealtimeUpdates();
        }
    };

    // Function to enable real-time updates - FIXED VERSION
    const enableRealtimeUpdates = () => {
        if (!filters.node || filters.node === 'all' || !selectedYear || !selectedMonth) {
            console.log('Cannot enable real-time updates without node, year, and month selection');
            return;
        }

        // Clean up any existing listener first
        disableRealtimeUpdates();
        
        // Only listen for the current day and forward
        const today = new Date();
        const currentYear = today.getFullYear().toString();
        const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
        const currentDay = today.getDate().toString().padStart(2, '0');
        
        // If we're viewing historical data, we can optimize by only listening for today's updates
        let listenPath;
        if (selectedYear === currentYear && selectedMonth === currentMonth) {
            // We're viewing current month, listen at month level
            listenPath = `${filters.node}/${selectedYear}/${selectedMonth}`;
        } else {
            // We're viewing historical data, only listen for today's updates
            listenPath = `${filters.node}/${currentYear}/${currentMonth}/${currentDay}`;
        }
        
        console.log(`Setting up optimized real-time listener for ${listenPath}`);
        
        // Reset the timestamp tracker when starting a new listener
        lastProcessedTimestampRef.current = {};
        
        const nodeRef = ref(database, listenPath);
        const unsubscribe = onValue(nodeRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            
            // Track update time for display
            lastUpdateTimeRef.current = new Date();
            
            // Use a worker thread if available, or process efficiently if not
            processRealtimeUpdate(data, lastProcessedTimestampRef.current);
        }, (error) => {
            console.error(`Error in real-time listener: ${error.message}`);
            disableRealtimeUpdates();
        });
        
        // Store the unsubscribe function
        activeListenerRef.current = unsubscribe;
        setRealtimeEnabled(true);
        console.log('Real-time updates enabled');
    };

    // 1. Add a new function for manual fetching
    // Keep this function - it handles manual data refresh
    const fetchLatestData = async () => {
        if (!filters.node || filters.node === 'all' || !selectedYear || !selectedMonth) {
            console.log('Cannot fetch latest data without node, year, and month selection');
            return;
        }
        
        setRealtimeUpdateInProgress(true);
        lastUpdateTimeRef.current = new Date(); // Set update time
        
        try {
            // Only fetch the current day's data for today's date or most recent day
            let fetchPath;
            const today = new Date();
            const currentYear = today.getFullYear().toString();
            const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
            const currentDay = today.getDate().toString().padStart(2, '0');
            
            if (selectedYear === currentYear && selectedMonth === currentMonth) {
                // We're viewing current month, fetch today's data
                fetchPath = `${filters.node}/${selectedYear}/${selectedMonth}/${currentDay}`;
            } else {
                // We're viewing historical data, fetch most recent day
                const mostRecentDay = availableDays[0]; // Assuming availableDays is sorted newest first
                fetchPath = `${filters.node}/${selectedYear}/${selectedMonth}/${mostRecentDay}`;
            }
            
            console.log(`Fetching latest data from: ${fetchPath}`);
            const dataRef = ref(database, fetchPath);
            const snapshot = await get(dataRef);
            const data = snapshot.val();
            
            if (data) {
                // Process the new data
                const formattedDate = selectedYear === currentYear && selectedMonth === currentMonth 
                ? `${currentYear}-${currentMonth}-${currentDay}`
                : `${selectedYear}-${selectedMonth}-${availableDays[0]}`;
                
                const day = formattedDate.split('-')[2];
                
                // Convert to readings format
                const dayReadings = Object.keys(data).map(time => ({
                    id: `${formattedDate}-${time}`,
                    deviceId: filters.node,
                    node: filters.node,
                    timestamp: `${formattedDate}T${time}`,
                    voltage: data[time].voltage,
                    current: data[time].current,
                    power: data[time].power,
                    power_factor: data[time].powerFactor,
                    frequency: data[time].frequency,
                    is_anomaly: data[time].is_anomaly || false,
                    location: `BD-${filters.node.slice(2)}`,
                    isNew: true // Mark as new for highlighting
                }));
                
                // Update cache
                addToCache(filters.node, selectedYear, selectedMonth, day, [
                    ...checkCache(filters.node, selectedYear, selectedMonth, day) || [],
                    ...dayReadings
                ]);
                
                // Get existing readings without this day
                const readingsWithoutThisDay = readings.filter(
                    r => !r.id.startsWith(`${formattedDate}`)
                );
                
                // Add the new readings
                const updatedReadings = [
                    ...readingsWithoutThisDay,
                    ...dayReadings
                ];
                
                // Sort by timestamp
                updatedReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Update the readings state
                setReadings(updatedReadings);
                
                // Update notification
                setNewDataCount(dayReadings.length);
                
                // Schedule notification to disappear after 5 seconds
                setTimeout(() => {
                    setNewDataCount(0);
                }, 5000);
                
                console.log(`Fetched ${dayReadings.length} new readings`);
            } else {
                console.log('No new data available');
            }
        } catch (error) {
            console.error('Error fetching latest data:', error);
        } finally {
            setRealtimeUpdateInProgress(false);
        }
    };
    
    // 2. Replace the real-time update UI components with a manual refresh button
    // Find this code:

    const processRealtimeUpdate = (data, lastProcessedTimestamps) => {
        // Process each day's data, but avoid re-processing data we've seen before
        // For simplicity, we start with existing readings but create a new array
        let allUpdatedReadings = [...readings];
        let newReadingsCount = 0;
        
        // Get all days from the real-time update
        const days = Object.keys(data).filter(key => /^\d+$/.test(key));
        
        // Only process a subset of days per update if there are many
        // This prevents trying to process too much at once
        const daysToProcess = days.length > 3 ? days.slice(0, 3) : days;
        
        // Process each day's data in the subset
        daysToProcess.forEach(day => {
            const dayData = data[day];
            if (!dayData) return;
            
            const formattedDate = `${selectedYear}-${selectedMonth}-${day}`;
            const lastProcessedForDay = lastProcessedTimestamps[day] || 0;
            
            // Get only timestamps that are newer than our last processed timestamp
            // Convert object to array and sort to ensure processing in order
            const times = Object.keys(dayData)
                .filter(time => {
                    // If we need to check if this timestamp is newer than last processed
                    const timeValue = new Date(`${formattedDate}T${time}`).getTime();
                    return timeValue > lastProcessedForDay;
                })
                .sort();
            
            if (times.length === 0) return; // No new data for this day
            
            // Convert to readings format - only the new ones
            const newDayReadings = times.map(time => {
                const reading = dayData[time];
                return {
                    id: `${formattedDate}-${time}`,
                    deviceId: filters.node,
                    node: filters.node,
                    timestamp: `${formattedDate}T${time}`,
                    voltage: reading.voltage,
                    current: reading.current,
                    power: reading.power,
                    power_factor: reading.powerFactor,
                    frequency: reading.frequency,
                    is_anomaly: reading.is_anomaly || false,
                    location: `BD-${filters.node.slice(2)}`,
                    isNew: true // Mark as new for highlighting
                };
            });
            
            // Update the last processed timestamp for this day
            lastProcessedTimestamps[day] = new Date(`${formattedDate}T${times[times.length - 1]}`).getTime();
            
            if (newDayReadings.length > 0) {
                newReadingsCount += newDayReadings.length;
                
                // Update cache
                addToCache(filters.node, selectedYear, selectedMonth, day, [
                    ...checkCache(filters.node, selectedYear, selectedMonth, day) || [],
                    ...newDayReadings
                ]);
                
                // Remove any existing readings for this day and add new ones
                const readingsWithoutThisDay = allUpdatedReadings.filter(
                    r => !r.id.startsWith(`${formattedDate}`)
                );
                
                // To avoid excessive re-renders, we'll only replace readings for this day
                const existingDayData = checkCache(filters.node, selectedYear, selectedMonth, day) || [];
                
                allUpdatedReadings = [
                    ...readingsWithoutThisDay,
                    ...existingDayData
                ];
            }
        });
        
        // Only update state if we have new readings
        if (newReadingsCount > 0) {
            // Sort readings by timestamp (newest first)
            allUpdatedReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Use the throttled update function to reduce render frequency
            throttledUpdateReadings(allUpdatedReadings);
            
            // Update notification count
            setNewDataCount(prevCount => prevCount + newReadingsCount);
            
            console.log(`Processed ${newReadingsCount} new readings`);
            
            // Schedule notification to disappear after 5 seconds
            if (newDataCount > 0) {
                setTimeout(() => {
                    setNewDataCount(0);
                }, 5000);
            }
        }
        
        // Hints for garbage collection after processing large data
        if (newReadingsCount > 100) {
            setTimeout(() => {
                // This timeout allows the JS engine to identify unused objects
                // for garbage collection after processing large amounts of data
            }, 0);
        }
    };

    // Function to disable real-time updates
    const disableRealtimeUpdates = () => {
        if (activeListenerRef.current) {
            activeListenerRef.current();
            activeListenerRef.current = null;
            setRealtimeEnabled(false);
            console.log('Real-time updates disabled');
        }
    };

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            disableRealtimeUpdates();
        };
    }, []);

    // Enable real-time updates automatically when data loads
    // useEffect(() => {
    //     if (readings.length > 0 && filters.node && selectedYear && selectedMonth && !realtimeEnabled) {
    //         // Wait a second after initial data load to set up real-time listener
    //         const timer = setTimeout(() => {
    //             enableRealtimeUpdates();
    //         }, 1000);
            
    //         return () => clearTimeout(timer);
    //     }
    // }, [readings.length, filters.node, selectedYear, selectedMonth, realtimeEnabled]);
    
    // // Add this cleanup effect when selection changes
    // useEffect(() => {
    //     disableRealtimeUpdates();
    // }, [filters.node, selectedYear, selectedMonth]);

    // Function to fetch data for an entire month
    const fetchDataForMonth = async (days) => {
        if (!filters.node || !selectedYear || !selectedMonth || !days || days.length === 0) {
            return;
        }
        
        if (isFetchInProgressRef.current) return;
        isFetchInProgressRef.current = true;
        
        setLoading(true);
        setDataLoadProgress(0);
        setReadings([]);
        
        try {
            let allReadings = [];
            const totalDays = days.length;
            
            // Fetch each day's data sequentially
            for (let i = 0; i < totalDays; i++) {
                const day = days[i];
                const path = `${filters.node}/${selectedYear}/${selectedMonth}/${day}`;
                
                setDataLoadProgress(Math.round(((i + 1) / totalDays) * 100));
                
                // Check cache first
                const cachedData = checkCache(filters.node, selectedYear, selectedMonth, day);
                if (cachedData) {
                    console.log(`Using cached data for ${path}`);
                    allReadings = [...allReadings, ...cachedData];
                    continue;
                }
                
                try {
                    console.log(`Fetching data from path: ${path}`);
                    const dayRef = ref(database, path);
                    const snapshot = await get(dayRef);
                    const data = snapshot.val();
                    
                    if (data) {
                        // Format date properly for this day
                        const formattedDate = `${selectedYear}-${selectedMonth}-${day}`;
                        
                        // Convert Firebase data to readings format
                        const dayReadings = Object.keys(data).map(time => ({
                            id: `${formattedDate}-${time}`,
                            deviceId: filters.node,
                            node: filters.node,
                            timestamp: `${formattedDate}T${time}`,
                            voltage: data[time].voltage,
                            current: data[time].current,
                            power: data[time].power,
                            power_factor: data[time].powerFactor,
                            frequency: data[time].frequency,
                            is_anomaly: data[time].is_anomaly || false,
                            location: `BD-${filters.node.slice(2)}`
                        }));
                        
                        // Store in cache
                        addToCache(filters.node, selectedYear, selectedMonth, day, dayReadings);
                        
                        // Add to total readings
                        allReadings = [...allReadings, ...dayReadings];
                        console.log(`Loaded ${dayReadings.length} readings from ${formattedDate}`);
                    }
                } catch (err) {
                    console.error(`Error fetching data from ${path}:`, err);
                }
            }
            
            // Sort readings by timestamp
            allReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Update readings state
            setReadings(allReadings);
            console.log(`Loaded a total of ${allReadings.length} readings`);
            
        } catch (err) {
            console.error("Error in data processing:", err);
            setError("Failed to load readings data: " + err.message);
        } finally {
            setLoading(false);
            setDataLoadProgress(100);
            isFetchInProgressRef.current = false;
        }
    };
    
    // Function to fetch data for a specific day
    const fetchDay = async (day) => {
        if (!filters.node || !selectedYear || !selectedMonth) return;
        
        setLoading(true);
        setSelectedDay(day);
        
        try {
            const path = `${filters.node}/${selectedYear}/${selectedMonth}/${day}`;
            
            // Check cache first
            const cachedData = checkCache(filters.node, selectedYear, selectedMonth, day);
            if (cachedData) {
                console.log(`Using cached data for ${path}`);
                setReadings(cachedData);
                return;
            }
            
            console.log(`Fetching data from path: ${path}`);
            const dayRef = ref(database, path);
            const snapshot = await get(dayRef);
            const data = snapshot.val();
            
            if (data) {
                // Format date properly for this day
                const formattedDate = `${selectedYear}-${selectedMonth}-${day}`;
                
                // Convert Firebase data to readings format
                const dayReadings = Object.keys(data).map(time => ({
                    id: `${formattedDate}-${time}`,
                    deviceId: filters.node,
                    node: filters.node,
                    timestamp: `${formattedDate}T${time}`,
                    voltage: data[time].voltage,
                    current: data[time].current,
                    power: data[time].power,
                    power_factor: data[time].powerFactor,
                    frequency: data[time].frequency,
                    is_anomaly: data[time].is_anomaly || false,
                    location: `BD-${filters.node.slice(2)}`
                }));
                
                // Store in cache
                addToCache(filters.node, selectedYear, selectedMonth, day, dayReadings);
                
                // Update readings state
                dayReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setReadings(dayReadings);
                console.log(`Loaded ${dayReadings.length} readings from ${formattedDate}`);
            } else {
                console.log(`No data found for ${path}`);
                setReadings([]);
            }
        } catch (err) {
            console.error(`Error fetching day data:`, err);
            setError("Failed to load day data: " + err.message);
            setReadings([]);
        } finally {
            setLoading(false);
        }
    };
    
    // Reset filters
    const resetFilters = () => {
        setFilters({
            node: 'all',
            dateRange: { startDate: '', endDate: '' },
            voltage: { min: '', max: '' },
            current: { min: '', max: '' },
            power: { min: '', max: '' },
            powerFactor: { min: '', max: '' },
            frequency: { min: '', max: '' },
            anomalyOnly: false
        });
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedDay(null);
        setCurrentPage(1);
    };

    
        // Add this function to check if a reading is anomalous based on thresholds
    const isAnomalyByThresholds = (reading) => {
        // Apply the thresholds from auto_label_data function
        if (!(217.4 <= reading.voltage && reading.voltage <= 242.6)) {
            return true;
        }
        if (!(59.2 <= reading.frequency && reading.frequency <= 60.8)) {
            return true;
        }
        if (!(0.792 <= reading.power_factor && reading.power_factor <= 1)) {
            return true;
        }
        return false;
    };
    
    
    // Apply client-side filtering on loaded data
    // Update the filteredReadings useMemo
    const filteredReadings = useMemo(() => {
        return readings.filter(reading => {
            // Filter by voltage
            if (filters.voltage.min && reading.voltage < parseFloat(filters.voltage.min)) return false;
            if (filters.voltage.max && reading.voltage > parseFloat(filters.voltage.max)) return false;
            
            // Filter by current
            if (filters.current.min && reading.current < parseFloat(filters.current.min)) return false;
            if (filters.current.max && reading.current > parseFloat(filters.current.max)) return false;
            
            // Filter by power
            if (filters.power.min && reading.power < parseFloat(filters.power.min)) return false;
            if (filters.power.max && reading.power > parseFloat(filters.power.max)) return false;
            
            // Filter by power factor
            if (filters.powerFactor.min && reading.power_factor < parseFloat(filters.powerFactor.min)) return false;
            if (filters.powerFactor.max && reading.power_factor > parseFloat(filters.powerFactor.max)) return false;
            
            // Filter by frequency
            if (filters.frequency.min && reading.frequency < parseFloat(filters.frequency.min)) return false;
            if (filters.frequency.max && reading.frequency > parseFloat(filters.frequency.max)) return false;
            
            // Filter by anomaly - include both server flag and custom thresholds
            if (filters.anomalyOnly) {
                const isAnomaly = reading.is_anomaly || isAnomalyByThresholds(reading);
                if (!isAnomaly) return false;
            }
            
            return true;
        });
    }, [readings, filters]);

    // Pagination
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    // Also memoize current items for display
    const currentItems = useMemo(() => {
        return filteredReadings.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredReadings, indexOfFirstItem, indexOfLastItem]);
    
    // Pagination handlers
    const nextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };
    
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };
    
    // Filter handlers
    const openFilterModal = () => {
        setTempFilters({...filters});
        setShowFilterModal(true);
    };
    
    const closeFilterModal = () => {
        setShowFilterModal(false);
    };
    
    const handleFilterChange = (category, field, value) => {
        setTempFilters(prev => ({
            ...prev,
            [category]: field ? {...prev[category], [field]: value} : value
        }));
    };
    
    const applyFilters = () => {
        // Check if node changed
        const nodeChanged = filters.node !== tempFilters.node;
        
        setFilters({...tempFilters});
        setCurrentPage(1);
        closeFilterModal();
        
        // If node changed, this will trigger the node effect which starts the data fetching chain
        if (nodeChanged) {
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedDay(null);
        }
    };
    
    // Download PDF handler
    const handleDownloadPDF = () => {
        alert('Downloading data as PDF...');
        // Implement PDF download logic here
    };

    // Format date for display
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    };
    
    // Format time for display
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };
    
    // Format month names
    const getMonthName = (month) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[parseInt(month) - 1];
    };

    // Define ReadingRow as a memoized component for better performance
    // Update your ReadingRow component
    const ReadingRow = React.memo(({ reading, formatDate, formatTime }) => {
        // Check if anomalous by thresholds or by the server-side flag
        const isAnomaly = reading.is_anomaly || isAnomalyByThresholds(reading);
        
        // Add specific classes to highlight what type of anomaly it is
        const getAnomalyReason = () => {
            if (!(217.4 <= reading.voltage && reading.voltage <= 242.6)) {
                return "Voltage out of range";
            }
            if (!(59.2 <= reading.frequency && reading.frequency <= 60.8)) {
                return "Frequency out of range";
            }
            if (!(0.792 <= reading.power_factor && reading.power_factor <= 1)) {
                return "Power Factor out of range";
            }
            if (reading.is_anomaly) {
                return "Other anomaly detected";
            }
            return "";
        };
        
        const anomalyReason = isAnomaly ? getAnomalyReason() : "";
        
        return (
            <tr 
                className={`${isAnomaly ? 'anomaly-row' : ''} ${reading.isNew ? 'new-reading' : ''}`}
                title={anomalyReason ? `Anomaly: ${anomalyReason}` : ""}
            >
                <td>{reading.deviceId}</td>
                <td>{formatDate(reading.timestamp)}</td>
                <td>{formatTime(reading.timestamp)}</td>
                <td>{reading.location}</td>
                <td className={!(217.4 <= reading.voltage && reading.voltage <= 242.6) ? 'anomaly-value' : ''}>
                    {reading.voltage}
                </td>
                <td>{reading.current}</td>
                <td>{reading.power}</td>
                <td className={!(59.2 <= reading.frequency && reading.frequency <= 60.8) ? 'anomaly-value' : ''}>
                    {reading.frequency}
                </td>
                <td className={!(0.792 <= reading.power_factor && reading.power_factor <= 1) ? 'anomaly-value' : ''}>
                    {reading.power_factor}
                </td>
                <td className={isAnomaly ? 'anomaly-cell' : 'normal-cell'}>
                    {isAnomaly ? (
                        <span className="anomaly-indicator" title={anomalyReason}>
                            <FontAwesomeIcon icon={faExclamationTriangle} /> Yes
                        </span>
                    ) : (
                        <span className="normal-indicator">
                            <FontAwesomeIcon icon={faCheck} /> No
                        </span>
                    )}
                </td>
            </tr>
        );
    });

    return (
        <div className="readings-container">
            {/* Title Row */}
            <div className="header-row">
                <h2 className="main-title">Power Quality Tabled Data</h2>
                <button className="download-btn" onClick={handleDownloadPDF} disabled={filteredReadings.length === 0}>
                    <FontAwesomeIcon icon={faDownload} /> Download as PDF
                </button>
            </div>
            
            {/* Hierarchical Navigation */}
            <div className="navigation-bar">
                {/* Node Selection */}
                <div className="nav-item">
                    <label>Node</label>
                    <select 
                        className="nav-select"
                        value={filters.node}
                        onChange={(e) => {
                            setFilters(prev => ({...prev, node: e.target.value}));
                            setSelectedYear(null);
                            setSelectedMonth(null);
                            setSelectedDay(null);
                        }}
                        disabled={loading}
                    >
                        <option value="all">Select Node</option>
                        {availableNodes.map(node => (
                            <option key={node} value={node}>{node}</option>
                        ))}
                    </select>
                </div>
                
                {/* Year Selection */}
                <div className={`nav-item ${filters.node === 'all' ? 'disabled' : ''}`}>
                    <label>Year</label>
                    <select 
                        className="nav-select"
                        value={selectedYear || ''}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        disabled={loading || availableYears.length === 0 || filters.node === 'all'}
                    >
                        <option value="">Year</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                
                {/* Month Selection */}
                <div className={`nav-item ${!selectedYear ? 'disabled' : ''}`}>
                    <label>Month</label>
                    <select 
                        className="nav-select"
                        value={selectedMonth || ''}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        disabled={loading || availableMonths.length === 0 || !selectedYear}
                    >
                        <option value="">Month</option>
                        {availableMonths.map(month => (
                            <option key={month} value={month}>{month.padStart(2, '0')}</option>
                        ))}
                    </select>
                </div>
                
                {/* Day Selection */}
                <div className={`nav-item ${!selectedMonth ? 'disabled' : ''}`}>
                    <label>Day</label>
                    <select 
                        className="nav-select"
                        value={selectedDay || ''}
                        onChange={(e) => fetchDay(e.target.value)}
                        disabled={loading || availableDays.length === 0 || !selectedMonth}
                    >
                        <option value="">All Days</option>
                        {availableDays.map(day => (
                            <option key={day} value={day}>{day.padStart(2, '0')}</option>
                        ))}
                    </select>
                </div>
                
                {/* Spacer to push parameter filters to the right */}
                <div className="nav-spacer"></div>
                
                {/* Filter Controls */}
                <div className="nav-filters">
                    {/* Parameter Filters Button */}
                    <button 
                        className="parameter-filter-btn" 
                        onClick={openFilterModal} 
                        disabled={readings.length === 0}
                    >
                        <FontAwesomeIcon icon={faFilter} /> Parameter Filters
                    </button>
                    
                    {/* Reset Button - Only shown when there are active parameter filters */}
                    {Object.keys(filters).some(k => 
                        k !== 'node' && k !== 'dateRange' && 
                        (k === 'anomalyOnly' ? filters[k] : 
                        (filters[k].min || filters[k].max))
                    ) && (
                        <button 
                            className="reset-filters-button" 
                            onClick={() => {
                                setFilters(prev => ({
                                    ...prev,
                                    voltage: { min: '', max: '' },
                                    current: { min: '', max: '' },
                                    power: { min: '', max: '' },
                                    powerFactor: { min: '', max: '' },
                                    frequency: { min: '', max: '' },
                                    anomalyOnly: false
                                }));
                            }}
                        >
                            <FontAwesomeIcon icon={faUndo} /> Reset
                        </button>
                    )}
                </div>
            </div>
                
                {readings.length > 0 && filters.node && selectedYear && selectedMonth && (
                    <div className="data-refresh-container">
                        <button 
                            className="data-refresh-btn"
                            onClick={fetchLatestData}
                            disabled={realtimeUpdateInProgress}
                        >
                            <FontAwesomeIcon icon={faSync} className={realtimeUpdateInProgress ? 'fa-spin' : ''} />
                            {realtimeUpdateInProgress ? 'Refreshing Data...' : 'Refresh Data'}
                        </button>
                        {lastUpdateTimeRef.current && (
                            <span className="last-update">
                                Last update: {new Date(lastUpdateTimeRef.current).toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                )}
            {/* New data notification */}
            {newDataCount > 0 && (
                <div className="new-data-notification">
                    <FontAwesomeIcon icon={faBell} />
                    <span>{newDataCount} new reading{newDataCount !== 1 ? 's' : ''} received</span>
                </div>
            )}

            {/* Real-time update in progress indicator */}
            {realtimeEnabled && realtimeUpdateInProgress && (
                <div className="realtime-update-indicator">
                    <div className="spinner-mini"></div>
                    <span>Updating data...</span>
                </div>
            )}
            
            {/* Loading Progress */}
            {loading && dataLoadProgress > 0 && dataLoadProgress < 100 && (
                <div className="data-loading-progress">
                    <div className="progress-bar-container">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${dataLoadProgress}%` }}
                        ></div>
                    </div>
                    <div className="progress-text">Loading data: {Math.round(dataLoadProgress)}% complete</div>
                </div>
            )}
            
            {/* Loading State */}
            {loading && dataLoadProgress === 0 && (
                <div className="loading-container">
                    <div className="spinner-container">
                        <FontAwesomeIcon icon={faSpinner} className="loading-spinner" />
                        <span>Loading data...</span>
                    </div>
                </div>
            )}
            
            {/* Error State */}
            {error && <div className="error-message">{error}</div>}
            
            {/* Applied Parameter Filters */}
            {!loading && Object.keys(filters).some(k => 
                k !== 'node' && k !== 'dateRange' && 
                (k === 'anomalyOnly' ? filters[k] : 
                (filters[k].min || filters[k].max))
            ) && (
                <div className="applied-filters">
                    <div className="applied-filters-header">
                        <h4>Applied Parameter Filters</h4>
                    </div>
                    <div className="filter-tags">
                        {(filters.voltage.min || filters.voltage.max) && (
                            <span className="filter-tag">
                                <span className="filter-tag-label">Voltage:</span>
                                <span className="filter-tag-value">{filters.voltage.min || '0'} - {filters.voltage.max || '∞'} V</span>
                            </span>
                        )}
                        {(filters.current.min || filters.current.max) && (
                            <span className="filter-tag">
                                <span className="filter-tag-label">Current:</span>
                                <span className="filter-tag-value">{filters.current.min || '0'} - {filters.current.max || '∞'} A</span>
                            </span>
                        )}
                        {(filters.power.min || filters.power.max) && (
                            <span className="filter-tag">
                                <span className="filter-tag-label">Power:</span>
                                <span className="filter-tag-value">{filters.power.min || '0'} - {filters.power.max || '∞'} W</span>
                            </span>
                        )}
                        {(filters.frequency.min || filters.frequency.max) && (
                            <span className="filter-tag">
                                <span className="filter-tag-label">Frequency:</span>
                                <span className="filter-tag-value">{filters.frequency.min || '0'} - {filters.frequency.max || '∞'} Hz</span>
                            </span>
                        )}
                        {(filters.powerFactor.min || filters.powerFactor.max) && (
                            <span className="filter-tag">
                                <span className="filter-tag-label">Power Factor:</span>
                                <span className="filter-tag-value">{filters.powerFactor.min || '0'} - {filters.powerFactor.max || '1'}</span>
                            </span>
                        )}
                        {filters.anomalyOnly && (
                            <span className="filter-tag anomaly-tag">
                                <span className="filter-tag-label">Status:</span>
                                <span className="filter-tag-value">Anomalies Only</span>
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            {/* No Data State */}
            {!loading && !error && filteredReadings.length === 0 && (
                <div className="no-data-message">
                    {filters.node === 'all' ? (
                        <>
                            <FontAwesomeIcon icon={faExclamationTriangle} size="2x" style={{marginBottom: '15px'}} />
                            <p>Please select a specific node to view data.</p>
                        </>
                    ) : selectedYear && selectedMonth ? (
                        <>
                            <FontAwesomeIcon icon={faExclamationTriangle} size="2x" style={{marginBottom: '15px'}} />
                            <p>No data available for the selected time period or filters.</p>
                            <button className="reset-btn" onClick={resetFilters}>
                                <FontAwesomeIcon icon={faUndo} /> Reset All Selections
                            </button>
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faCalendarAlt} size="2x" style={{marginBottom: '15px'}} />
                            <p>Please select a year and month to view data.</p>
                        </>
                    )}
                </div>
            )}
            
            {/* Data Table */}
            {!loading && !error && filteredReadings.length > 0 && (
                <>
                    <div className="table-container">
                        <table className="readings-table">
                            <thead>
                                <tr>
                                    <th>Node Code</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Location</th>
                                    <th>Voltage (V)</th>
                                    <th>Current (A)</th>
                                    <th>Power (W)</th>
                                    <th>Frequency (Hz)</th>
                                    <th>Power Factor</th>
                                    <th>Anomaly</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((reading) => (
                                    <ReadingRow 
                                        key={reading.id}
                                        reading={reading}
                                        formatDate={formatDate}
                                        formatTime={formatTime}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="pagination-controls">
                        <div className="pagination-info">
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReadings.length)} of {filteredReadings.length} entries
                        </div>
                        <div className="pagination-buttons">
                            <button 
                                className="pagination-btn" 
                                onClick={prevPage} 
                                disabled={currentPage === 1}
                            >
                                <FontAwesomeIcon icon={faChevronLeft} /> Previous
                            </button>
                            <span className="pagination-page-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                className="pagination-btn" 
                                onClick={nextPage} 
                                disabled={currentPage === totalPages}
                            >
                                Next <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                        <div className="items-per-page">
                            <label htmlFor="items-select">Items per page:</label>
                            <select 
                                id="items-select" 
                                value={itemsPerPage} 
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Reset to first page
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
            
            {/* Filter Modal */}
            {showFilterModal && (
                <div className="modal-overlay" onClick={closeFilterModal}>
                    <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Parameter Filters</h3>
                            <button className="close-modal" onClick={closeFilterModal}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="filter-content">
                            <div className="filter-panel">
                                <div className="note-box">
                                    <p><strong>Note:</strong> These filters operate on data already loaded for the selected time period.</p>
                                </div>
                                
                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label>Anomaly Status</label>
                                        <div className="checkbox-group">
                                            <input 
                                                type="checkbox" 
                                                id="anomaly-only" 
                                                checked={tempFilters.anomalyOnly}
                                                onChange={(e) => handleFilterChange('anomalyOnly', null, e.target.checked)}
                                            />
                                            <label htmlFor="anomaly-only">Show anomalies only</label>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label>Voltage Range (V)</label>
                                        <div className="range-inputs">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                value={tempFilters.voltage.min}
                                                onChange={(e) => handleFilterChange('voltage', 'min', e.target.value)}
                                            />
                                            <span>to</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                value={tempFilters.voltage.max}
                                                onChange={(e) => handleFilterChange('voltage', 'max', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>Current Range (A)</label>
                                        <div className="range-inputs">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                value={tempFilters.current.min}
                                                onChange={(e) => handleFilterChange('current', 'min', e.target.value)}
                                            />
                                            <span>to</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                value={tempFilters.current.max}
                                                onChange={(e) => handleFilterChange('current', 'max', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label>Power Range (W)</label>
                                        <div className="range-inputs">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                value={tempFilters.power.min}
                                                onChange={(e) => handleFilterChange('power', 'min', e.target.value)}
                                            />
                                            <span>to</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                value={tempFilters.power.max}
                                                onChange={(e) => handleFilterChange('power', 'max', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>Frequency Range (Hz)</label>
                                        <div className="range-inputs">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                value={tempFilters.frequency.min}
                                                onChange={(e) => handleFilterChange('frequency', 'min', e.target.value)}
                                            />
                                            <span>to</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                value={tempFilters.frequency.max}
                                                onChange={(e) => handleFilterChange('frequency', 'max', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label>Power Factor Range</label>
                                        <div className="range-inputs">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                min="0" 
                                                max="1" 
                                                step="0.01"
                                                value={tempFilters.powerFactor.min}
                                                onChange={(e) => handleFilterChange('powerFactor', 'min', e.target.value)}
                                            />
                                            <span>to</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                min="0" 
                                                max="1" 
                                                step="0.01"
                                                value={tempFilters.powerFactor.max}
                                                onChange={(e) => handleFilterChange('powerFactor', 'max', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={closeFilterModal}>Cancel</button>
                            <button className="apply-btn" onClick={applyFilters}>
                                <FontAwesomeIcon icon={faSearch} /> Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Summary */}
            {!loading && filteredReadings.length > 0 && (
                <div className="data-stats">
                    <p>
                        {selectedYear && selectedMonth ? (
                            selectedDay ? 
                            `Viewing data for ${filters.node} on ${selectedYear}-${selectedMonth}-${selectedDay}` :
                            `Viewing data for ${filters.node} in ${getMonthName(selectedMonth)} ${selectedYear}`
                        ) : ''}
                        {' • '} 
                        {filteredReadings.length} readings 
                        {filteredReadings.filter(r => r.is_anomaly).length > 0 && 
                         ` (including ${filteredReadings.filter(r => r.is_anomaly).length} anomalies)`}
                    </p>
                </div>
            )}
        </div>
    );
};

export default PowerReadings;