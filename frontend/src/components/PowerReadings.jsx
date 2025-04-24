import React, { useState, useEffect } from 'react';
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
// Add Firebase imports
import { database } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

const PowerReadings = () => {
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
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
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    
    // VITE_API_URL=http://127.0.0.1:8000/api/; See the .env file in the frontend directory
    const apiURL = `${import.meta.env.VITE_API_URL}`;

    useEffect(() => {
        // Reference to C-1 to get all dates/times
        const powerReadingsRef = ref(database, 'C-1/2025/03/10');
        
        // Listen for changes
        const unsubscribe = onValue(powerReadingsRef, (snapshot) => {
            setLoading(true);
            try {
                const data = snapshot.val();
                console.log('Firebase data:', data); // Debug: Check the data structure
                
                if (data) {
                    // Convert nested structure to flat array
                    const flattenedData = [];
                    
                    // The data structure is 'C-1/year/month/day/timestamp'
                    Object.keys(data).forEach(time => {
                        const reading = data[time];
                        flattenedData.push({
                            id: `2025-03-10-${time}`,
                            deviceId: 'C-1',
                            timestamp: `2025-03-10T${time}`,
                            voltage: reading.voltage,
                            current: reading.current,
                            power: reading.power,
                            power_factor: reading.powerFactor,
                            frequency: reading.frequency,
                            is_anomaly: Boolean(reading.is_anomaly), // Ensure boolean
                            location: 'BD-101' // Example location code
                        });
                    });
                    
                    // Sort by timestamp (newest first)
                    flattenedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    console.log('Processed readings:', flattenedData);
                    setReadings(flattenedData);
                } else {
                    setReadings([]);
                }
                setError(null);
            } catch (err) {
                console.error("Error processing data:", err);
                setError("Failed to load real-time data");
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Database error:", err);
            setError("Database connection error: " + err.message);
            setLoading(false);
        });
        
        // Cleanup listener on component unmount
        return () => unsubscribe();
    }, []);

    // Apply filtering
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
                                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                                <option key={`C-${num}`} value={`C-${num}`}>C-{num}</option>
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
                                
                                {/* New Date Range Filter */}
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
        </div>
    );
};

export default PowerReadings;