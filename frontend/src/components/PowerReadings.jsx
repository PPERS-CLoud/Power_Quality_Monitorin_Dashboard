import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../css/PowerReadings.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, 
  faFilter, 
  faTimes, 
  faUndo, 
  faSearch, 
  faChevronLeft, 
  faChevronRight, 
  faCheck, 
  faExclamationTriangle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

// Replace direct Firebase imports with API URL
const API_URL = import.meta.env.VITE_API_URL;

const PowerReadings = () => {
    // State variables
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [availableNodes, setAvailableNodes] = useState([]);
    const [queryLimit, setQueryLimit] = useState(200); // Default limit per node
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    
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
    
    // Fetch available nodes
    useEffect(() => {
        const fetchAvailableNodes = async () => {
            try {
                // Remove all caching logic and directly fetch from API
                console.log('Fetching nodes from API...');
                const response = await axios.get(`${API_URL}firebase/nodes/`);
                
                if (response.data && response.data.length > 0) {
                    console.log(`Successfully found ${response.data.length} nodes:`, response.data);
                    setAvailableNodes(response.data);
                } else {
                    throw new Error("No valid nodes found in API response");
                }
            } catch (err) {
                console.error('Error fetching nodes from API:', err);
                // Use a set of known nodes as fallback
                const fallbackNodes = ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'];
                console.log('Using fallback nodes:', fallbackNodes);
                setAvailableNodes(fallbackNodes);
            }
        };
        
        fetchAvailableNodes();
    }, []);

    // Fetch data from API
    useEffect(() => {
        if (availableNodes.length === 0) return;
        
        setLoading(true);
        
        const fetchData = async () => {
            try {
                // Build a complete params object with all filters
                const params = {
                    limit: queryLimit,
                    // Date range filters
                    start_date: filters.dateRange.startDate || null,
                    end_date: filters.dateRange.endDate || null,
                    // Range filters
                    voltage_min: filters.voltage.min || null,
                    voltage_max: filters.voltage.max || null,
                    current_min: filters.current.min || null,
                    current_max: filters.current.max || null,
                    power_min: filters.power.min || null,
                    power_max: filters.power.max || null,
                    power_factor_min: filters.powerFactor.min || null,
                    power_factor_max: filters.powerFactor.max || null,
                    frequency_min: filters.frequency.min || null,
                    frequency_max: filters.frequency.max || null,
                    // Boolean filters
                    anomaly_only: filters.anomalyOnly || null
                };

                // Remove null/undefined values to keep the URL params clean
                Object.keys(params).forEach(key => 
                    (params[key] === null || params[key] === undefined) && delete params[key]
                );

                if (filters.node === 'all') {
                    // For "all" nodes, fetch data for multiple nodes
                    const nodesToFetch = availableNodes.slice(0, 5); // Limit to first 5 nodes for performance
                    console.log(`Fetching data for multiple nodes: ${nodesToFetch.join(', ')}`);
                    
                    // Use the compare endpoint which handles multiple nodes
                    params.nodes = nodesToFetch.join(',');
                    params.limit = Math.ceil(queryLimit / nodesToFetch.length); // Split the limit between nodes
                    
                    console.log('Fetching data with params:', params);
                    const response = await axios.get(`${API_URL}firebase/compare/`, { params });
                    
                    if (response.data && response.data.length > 0) {
                        console.log(`Loaded ${response.data.length} readings for multiple nodes`);
                        
                        // Process the data
                        const processedReadings = response.data.map(reading => ({
                            id: reading.id || `${reading.deviceId}-${reading.timestamp}`,
                            deviceId: reading.deviceId,
                            timestamp: reading.timestamp,
                            voltage: reading.voltage || 0,
                            current: reading.current || 0,
                            power: reading.power || 0,
                            power_factor: reading.power_factor || 0,
                            frequency: reading.frequency || 0,
                            is_anomaly: reading.is_anomaly || false,
                            location: reading.location || `BD-${reading.deviceId.slice(2)}`
                        }));
                        
                        // Sort all readings by timestamp
                        processedReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        setReadings(processedReadings);
                    } else {
                        console.log(`No data found for multiple nodes in API response`);
                        setReadings([]);
                    }
                } else {
                    // Get specific node to fetch
                    const nodeToFetch = filters.node;
                    params.node = nodeToFetch;
                    
                    console.log(`Fetching data for node: ${nodeToFetch} with filters:`, params);
                    
                    // Fetch data from backend API with node parameter
                    const response = await axios.get(`${API_URL}firebase/data/`, { params });
                    
                    if (response.data && response.data.length > 0) {
                        console.log(`Loaded ${response.data.length} readings for ${nodeToFetch}`);
                        
                        // Map backend data to the format expected by the UI
                        const processedReadings = response.data.map(reading => ({
                            id: reading.id || `${reading.deviceId}-${reading.timestamp}`,
                            deviceId: reading.deviceId || nodeToFetch,
                            timestamp: reading.timestamp,
                            voltage: reading.voltage || 0,
                            current: reading.current || 0,
                            power: reading.power || 0,
                            power_factor: reading.power_factor || 0,
                            frequency: reading.frequency || 0,
                            is_anomaly: reading.is_anomaly || false,
                            location: reading.location || `BD-${nodeToFetch.slice(2)}`
                        }));
                        
                        // Sort after processing
                        processedReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        setReadings(processedReadings);
                    } else {
                        console.log(`No data found for ${nodeToFetch} in API response`);
                        setReadings([]);
                    }
                }
                
                setError(null);
            } catch (err) {
                console.error('Error fetching data from API:', err);
                setError('Failed to load readings data: ' + (err.response?.data?.error || err.message));
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [availableNodes, filters.node, queryLimit, filters.dateRange.startDate, filters.dateRange.endDate]);

    // Load more data function
    const loadMoreData = () => {
        setLoading(true);
        
        setQueryLimit(prevLimit => {
            const newLimit = prevLimit + 200;
            console.log(`Increasing query limit to ${newLimit}`);
            return newLimit;
        });
    };
    
    // Load multiple nodes function
    const loadMultipleNodes = async () => {
        setLoading(true);
        
        try {
            // Get current node and 2-3 additional nodes to compare
            const currentNode = filters.node;
            const otherNodes = availableNodes
                .filter(node => node !== currentNode)
                .slice(0, 3);
            
            const nodesToCompare = [currentNode, ...otherNodes];
            console.log(`Comparing nodes: ${nodesToCompare.join(', ')}`);
            
            // Fetch data for multiple nodes
            const response = await axios.get(`${API_URL}firebase/compare/`, {
                params: {
                    nodes: nodesToCompare.join(','),
                    limit: 20 // Limit per node for performance
                }
            });
            
            if (response.data && response.data.length > 0) {
                console.log(`Loaded ${response.data.length} readings for comparison`);
                
                // Process and set the readings
                const processedReadings = response.data.map(reading => ({
                    id: reading.id || `${reading.deviceId}-${reading.timestamp}`,
                    deviceId: reading.deviceId,
                    timestamp: reading.timestamp,
                    voltage: reading.voltage || 0,
                    current: reading.current || 0,
                    power: reading.power || 0,
                    power_factor: reading.power_factor || 0,
                    frequency: reading.frequency || 0,
                    is_anomaly: reading.is_anomaly || false,
                    location: reading.location || `BD-${reading.deviceId.slice(2)}`
                }));
                
                // Sort all readings by timestamp
                processedReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setReadings(processedReadings);
                
                // Update filter to show all nodes
                setFilters(prev => ({
                    ...prev,
                    node: 'all'
                }));
            } else {
                throw new Error("No data found for comparison");
            }
        } catch (err) {
            console.error('Error comparing nodes:', err);
            setError('Failed to load comparison data: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };
    
    // Filter readings
    const filteredReadings = readings.filter(reading => {
        // Filter by node
        if (filters.node !== 'all' && reading.deviceId !== filters.node) return false;
        
        // Filter by date range
        if (filters.dateRange.startDate && new Date(reading.timestamp) < new Date(filters.dateRange.startDate + 'T00:00:00')) return false;
        if (filters.dateRange.endDate && new Date(reading.timestamp) > new Date(filters.dateRange.endDate + 'T23:59:59')) return false;
        
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
        
        // Filter by anomaly
        if (filters.anomalyOnly && !reading.is_anomaly) return false;
        
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredReadings.slice(indexOfFirstItem, indexOfLastItem);
    
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
        setFilters({...tempFilters});
        setCurrentPage(1); // Reset to first page after applying filters
        closeFilterModal();
    };
    
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
        setCurrentPage(1); // Reset to first page after clearing filters
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

    // ...existing return statement with UI components...
    return (
        <div className="readings-container">
            {/* Title Row */}
            <div className="header-row">
                <h2 className="main-title">Power Quality Tabled Data</h2>
                <button className="download-btn" onClick={handleDownloadPDF}>
                    <FontAwesomeIcon icon={faDownload} /> Download as PDF
                </button>
            </div>
            
            {/* Filter Controls Row */}
            <div className="subheader-row">
                <div className="applied-filters">
                    {filters.node !== 'all' && (
                        <span className="filter-tag">Node: {filters.node}</span>
                    )}
                    {(filters.dateRange.startDate || filters.dateRange.endDate) && (
                        <span className="filter-tag">
                            Date: {filters.dateRange.startDate || 'Any'} to {filters.dateRange.endDate || 'Any'}
                        </span>
                    )}
                    {(filters.voltage.min || filters.voltage.max) && (
                        <span className="filter-tag">
                            Voltage: {filters.voltage.min || '0'} - {filters.voltage.max || '∞'} V
                        </span>
                    )}
                    {/* Similar tags for other filter types */}
                    {filters.anomalyOnly && (
                        <span className="filter-tag anomaly-tag">Anomalies Only</span>
                    )}
                </div>
                <div className="button-group">
                    <button className="reset-btn" onClick={resetFilters} disabled={Object.keys(filters).every(k => k === 'node' ? filters[k] === 'all' : (k === 'anomalyOnly' ? !filters[k] : !filters[k].min && !filters[k].max))}>
                        <FontAwesomeIcon icon={faUndo} /> Reset Filters
                    </button>
                    <button className="filter-btn" onClick={openFilterModal}>
                        <FontAwesomeIcon icon={faFilter} /> Filter Data
                    </button>
                </div>
            </div>
            
            {/* Loading State */}
            {loading && (
                <div className="loading-container">
                    <div className="spinner-container">
                        <FontAwesomeIcon icon={faSpinner} className="loading-spinner" />
                        <span>Loading data...</span>
                    </div>
                </div>
            )}
            
            {/* Error State */}
            {error && <div className="error-message">{error}</div>}
            
            {/* No Data State */}
            {!loading && !error && filteredReadings.length === 0 && (
                <div className="no-data-message">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" style={{marginBottom: '15px'}} />
                    <p>No power readings match your current filters.</p>
                    {filters.node !== 'all' || Object.values(filters).some(f => typeof f === 'object' ? f.min || f.max : f) && (
                        <button className="reset-btn" onClick={resetFilters}>
                            <FontAwesomeIcon icon={faUndo} /> Reset Filters
                        </button>
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
                                    <tr key={reading.id} className={reading.is_anomaly ? 'anomaly-row' : ''}>
                                        <td>{reading.deviceId}</td>
                                        <td>{formatDate(reading.timestamp)}</td>
                                        <td>{formatTime(reading.timestamp)}</td>
                                        <td>{reading.location}</td>
                                        <td>{reading.voltage}</td>
                                        <td>{reading.current}</td>
                                        <td>{reading.power}</td>
                                        <td>{reading.frequency}</td>
                                        <td>{reading.power_factor}</td>
                                        <td className={reading.is_anomaly ? 'anomaly-cell' : 'normal-cell'}>
                                            {reading.is_anomaly ? (
                                                <span className="anomaly-indicator">
                                                    <FontAwesomeIcon icon={faExclamationTriangle} /> Yes
                                                </span>
                                            ) : (
                                                <span className="normal-indicator">
                                                    <FontAwesomeIcon icon={faCheck} /> No
                                                </span>
                                            )}
                                        </td>
                                    </tr>
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

            {/* Load More Button - Shows only when on the last page */}
            {!loading && currentPage === totalPages && totalPages > 0 && (
                <div className="load-more-container">
                    <button 
                        className="load-more-btn" 
                        onClick={loadMoreData}
                        disabled={loading}
                    >
                        {loading ? (
                            <><FontAwesomeIcon icon={faSpinner} className="spin" /> Loading...</>
                        ) : (
                            <>Load More Data <span className="load-more-count">+200</span></>
                        )}
                    </button>
                    <p className="load-more-info">Currently showing {readings.length} records. Load more to see additional data.</p>
                </div>
            )}
            
            {/* Filter Modal */}
            {showFilterModal && (
                <div className="modal-overlay" onClick={closeFilterModal}>
                    <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Filter Power Readings</h3>
                            <button className="close-modal" onClick={closeFilterModal}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="filter-content">
                            <div className="filter-panel">
                                <div className="note-box">
                                    <p><strong>Note:</strong> For performance reasons, select a specific node to see its most recent data. 
                                    Date range filtering is applied to the loaded data only.</p>
                                </div>
                                
                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label htmlFor="node-select">Node</label>
                                        <select 
                                            id="node-select" 
                                            className="node-select"
                                            value={tempFilters.node}
                                            onChange={(e) => handleFilterChange('node', null, e.target.value)}
                                        >
                                            <option value="all">All Nodes</option>
                                            {availableNodes.map(node => (
                                                <option key={node} value={node}>{node}</option>
                                            ))}
                                        </select>
                                    </div>
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
                                
                                {/* Date Range Filter */}
                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label>Date Range</label>
                                        <div className="date-range-inputs">
                                            <input 
                                                type="date" 
                                                placeholder="Start Date" 
                                                value={tempFilters.dateRange.startDate}
                                                onChange={(e) => handleFilterChange('dateRange', 'startDate', e.target.value)}
                                                className="date-input"
                                            />
                                            <span className="date-separator">to</span>
                                            <input 
                                                type="date" 
                                                placeholder="End Date" 
                                                value={tempFilters.dateRange.endDate}
                                                onChange={(e) => handleFilterChange('dateRange', 'endDate', e.target.value)}
                                                className="date-input"
                                            />
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

            {/* Data Debugging Info */}
            {!loading && (
                <div className="data-stats">
                    <p>Found {availableNodes.length} nodes • Showing {readings.length} readings for {filters.node === 'all' ? 'all nodes' : filters.node}</p>
                    
                    {/* Optional compare button */}
                    {availableNodes.length > 1 && filters.node !== 'all' && (
                        <button className="compare-btn" onClick={loadMultipleNodes}>
                            Compare with other nodes
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PowerReadings;