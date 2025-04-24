import React, { useState, useEffect, useMemo } from 'react';
import { database } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import '../css/PowerReadings.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFilter, faTimes, faSearch, faUndo, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const PowerReadings = () => {
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(false); // Add this line to fix the error
    const [error, setError] = useState(null); // Add this for error handling
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        node: '',
        voltageMin: '',
        voltageMax: '',
        currentMin: '',
        currentMax: '',
        powerMin: '',
        powerMax: '',
        frequencyMin: '',
        frequencyMax: '',
        powerFactorMin: '',
        powerFactorMax: '',
        dateStart: '',
        dateEnd: '',
    });
    const [activeFilters, setActiveFilters] = useState({});
    const [isFiltered, setIsFiltered] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // VITE_API_URL=http://127.0.0.1:8000/api/; See the .env file in the frontend directory
    const apiURL = `${import.meta.env.VITE_API_URL}`;
    
    // Extract unique node options from readings
    const nodeOptions = useMemo(() => {
        const nodes = new Set();
        readings.forEach(reading => {
            if (reading.node) {
                nodes.add(reading.node);
            }
        });
        return Array.from(nodes).sort();
    }, [readings]);

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
                            frequency: reading.frequency
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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({
            ...filters,
            [name]: value
        });
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const applyFilters = () => {
        setActiveFilters({...filters});
        setIsFiltered(true);
        setShowFilters(false);
    };

    const resetFilters = () => {
        setFilters({
            node: '',
            voltageMin: '',
            voltageMax: '',
            currentMin: '',
            currentMax: '',
            powerMin: '',
            powerMax: '',
            frequencyMin: '',
            frequencyMax: '',
            powerFactorMin: '',
            powerFactorMax: '',
            dateStart: '',
            dateEnd: '',
        });
        setActiveFilters({});
        setIsFiltered(false);
    };

    const downloadCSV = () => {
        // Create CSV content from readings
        const headers = "Node,Date,Time,Location,Voltage,Current,Power,Frequency,Power Factor,Anomaly\n";
        const csvContent = filteredReadings.map(reading => {
            const date = new Date(reading.timestamp);
            return `${reading.node || 'N/A'},${date.toLocaleDateString()},${date.toLocaleTimeString()},"${reading.location || 'N/A'}",${reading.voltage},${reading.current},${reading.power},${reading.frequency},${reading.power_factor},${reading.anomaly ? 'Yes' : 'No'}`;
        }).join("\n");
        
        // Create and download file
        const blob = new Blob([headers + csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'power_readings.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Filter the readings based on active filter criteria
    const filteredReadings = readings.filter(reading => {
        if (!isFiltered) return true;
        
        const readingDate = new Date(reading.timestamp);
        
        return (
            (activeFilters.node === '' || reading.node === activeFilters.node) &&
            (activeFilters.voltageMin === '' || reading.voltage >= parseFloat(activeFilters.voltageMin)) &&
            (activeFilters.voltageMax === '' || reading.voltage <= parseFloat(activeFilters.voltageMax)) &&
            (activeFilters.currentMin === '' || reading.current >= parseFloat(activeFilters.currentMin)) &&
            (activeFilters.currentMax === '' || reading.current <= parseFloat(activeFilters.currentMax)) &&
            (activeFilters.powerMin === '' || reading.power >= parseFloat(activeFilters.powerMin)) &&
            (activeFilters.powerMax === '' || reading.power <= parseFloat(activeFilters.powerMax)) &&
            (activeFilters.frequencyMin === '' || reading.frequency >= parseFloat(activeFilters.frequencyMin)) &&
            (activeFilters.frequencyMax === '' || reading.frequency <= parseFloat(activeFilters.frequencyMax)) &&
            (activeFilters.powerFactorMin === '' || reading.power_factor >= parseFloat(activeFilters.powerFactorMin)) &&
            (activeFilters.powerFactorMax === '' || reading.power_factor <= parseFloat(activeFilters.powerFactorMax)) &&
            (activeFilters.dateStart === '' || readingDate >= new Date(activeFilters.dateStart)) &&
            (activeFilters.dateEnd === '' || readingDate <= new Date(activeFilters.dateEnd))
        );
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredReadings.slice(indexOfFirstItem, indexOfLastItem);

    // Pagination handlers
    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    return (
        <div className="readings-container">
            <div className="header-row">
                <h1 className="main-title">Power Quality Data Analysis</h1>
                <button className="download-btn" onClick={downloadCSV}>
                    <FontAwesomeIcon icon={faDownload} /> Download CSV
                </button>
            </div>
            
            <div className="subheader-row">
                <h2 className="sub-title">Power Quality Tabled Data Factors</h2>
                <div className="button-group">
                    {isFiltered && (
                        <button className="reset-btn" onClick={resetFilters}>
                            <FontAwesomeIcon icon={faUndo} /> Reset Filters
                        </button>
                    )}
                    <button className="filter-btn" onClick={toggleFilters}>
                        <FontAwesomeIcon icon={faFilter} /> Filter Data
                    </button>
                </div>
            </div>
            
            {showFilters && (
                <div className="modal-overlay">
                    <div className="filter-modal">
                        <div className="modal-header">
                            <h3>Filter Data</h3>
                            <button className="close-modal" onClick={toggleFilters}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        
                        <div className="filter-content">
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label>Node Code:</label>
                                    <select 
                                        name="node" 
                                        value={filters.node} 
                                        onChange={handleFilterChange}
                                        className="node-select"
                                    >
                                        <option value="">All Nodes</option>
                                        {nodeOptions.map(node => (
                                            <option key={node} value={node}>
                                                {node}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="filter-group">
                                    <label>Voltage Range (V):</label>
                                    <div className="range-inputs">
                                        <input type="number" placeholder="Min" name="voltageMin" value={filters.voltageMin} onChange={handleFilterChange} />
                                        <span>to</span>
                                        <input type="number" placeholder="Max" name="voltageMax" value={filters.voltageMax} onChange={handleFilterChange} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label>Current Range (A):</label>
                                    <div className="range-inputs">
                                        <input type="number" placeholder="Min" name="currentMin" value={filters.currentMin} onChange={handleFilterChange} />
                                        <span>to</span>
                                        <input type="number" placeholder="Max" name="currentMax" value={filters.currentMax} onChange={handleFilterChange} />
                                    </div>
                                </div>
                                
                                <div className="filter-group">
                                    <label>Power Range (W):</label>
                                    <div className="range-inputs">
                                        <input type="number" placeholder="Min" name="powerMin" value={filters.powerMin} onChange={handleFilterChange} />
                                        <span>to</span>
                                        <input type="number" placeholder="Max" name="powerMax" value={filters.powerMax} onChange={handleFilterChange} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label>Frequency Range (Hz):</label>
                                    <div className="range-inputs">
                                        <input type="number" placeholder="Min" name="frequencyMin" value={filters.frequencyMin} onChange={handleFilterChange} />
                                        <span>to</span>
                                        <input type="number" placeholder="Max" name="frequencyMax" value={filters.frequencyMax} onChange={handleFilterChange} />
                                    </div>
                                </div>
                                
                                <div className="filter-group">
                                    <label>Power Factor Range:</label>
                                    <div className="range-inputs">
                                        <input type="number" placeholder="Min" name="powerFactorMin" value={filters.powerFactorMin} onChange={handleFilterChange} />
                                        <span>to</span>
                                        <input type="number" placeholder="Max" name="powerFactorMax" value={filters.powerFactorMax} onChange={handleFilterChange} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label>Date Range:</label>
                                    <div className="range-inputs">
                                        <input type="date" name="dateStart" value={filters.dateStart} onChange={handleFilterChange} />
                                        <span>to</span>
                                        <input type="date" name="dateEnd" value={filters.dateEnd} onChange={handleFilterChange} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={toggleFilters}>Cancel</button>
                            <button className="apply-btn" onClick={applyFilters}>
                                <FontAwesomeIcon icon={faSearch} /> Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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
                        {currentItems.map((reading) => {
                            const timestamp = new Date(reading.timestamp);
                            return (
                                <tr key={reading.id}>
                                    <td>{reading.node || 'N/A'}</td>
                                    <td>{timestamp.toLocaleDateString()}</td>
                                    <td>{timestamp.toLocaleTimeString()}</td>
                                    <td>{reading.location || 'N/A'}</td>
                                    <td>{reading.voltage}</td>
                                    <td>{reading.current}</td>
                                    <td>{reading.power}</td>
                                    <td>{reading.frequency}</td>
                                    <td>{reading.power_factor}</td>
                                    <td>{reading.anomaly ? 'Yes' : 'No'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {filteredReadings.length > 0 ? (
                <div className="pagination-controls">
                    <div className="pagination-info">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReadings.length)} of {filteredReadings.length} entries
                    </div>
                    <div className="pagination-buttons">
                        <button 
                            className="pagination-btn" 
                            onClick={goToPreviousPage} 
                            disabled={currentPage === 1}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} /> Previous
                        </button>
                        <span className="pagination-page-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button 
                            className="pagination-btn" 
                            onClick={goToNextPage} 
                            disabled={currentPage === totalPages}
                        >
                            Next <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                    <div className="items-per-page">
                        <label>Items per page:</label>
                        <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            ) : (
                <div className="no-data-message">No data available</div>
            )}
        </div>
    );
};

export default PowerReadings;