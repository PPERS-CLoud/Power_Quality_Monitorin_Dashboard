import React, { useState, useEffect } from 'react';
import { database } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import '../css/PowerReadings.css';

const PowerReadings = () => {
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5; // Number of records per page
    
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
    
    // Calculate pagination
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentReadings = readings.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(readings.length / recordsPerPage);
    
    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    
    if (loading && readings.length === 0) {
        return <div>Loading real-time power data...</div>;
    }
    
    if (error) {
        return <div className="error-message">{error}</div>;
    }
    
    return (
        <div className="readings-container">
            <h2 className="readings-title">Power Readings for March 10, 2025</h2>
            <p>Total records: {readings.length}</p>
            
            {readings.length > 0 ? (
                <>
                    <div className="table-container">
                        <table className="readings-table">
                            <thead>
                                <tr>
                                    <th>Device ID</th>
                                    <th>Time</th>
                                    <th>Voltage (V)</th>
                                    <th>Current (A)</th>
                                    <th>Power (W)</th>
                                    <th>Power Factor</th>
                                    <th>Frequency (Hz)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentReadings.map((reading) => (
                                    <tr key={reading.id}>
                                        <td>{reading.deviceId}</td>
                                        <td>{new Date(reading.timestamp).toLocaleString()}</td>
                                        <td>{reading.voltage}</td>
                                        <td>{reading.current}</td>
                                        <td>{reading.power}</td>
                                        <td>{reading.power_factor}</td>
                                        <td>{reading.frequency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="pagination-button"
                            >
                                Previous
                            </button>
                            
                            <span className="pagination-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            
                            <button 
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="pagination-button"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <p>No readings available. Please check your Firebase database.</p>
            )}
        </div>
    );
};

export default PowerReadings;