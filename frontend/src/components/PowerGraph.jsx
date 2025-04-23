import React, { useEffect } from 'react';
import '../css/PowerGraph.css';

const PowerGraph = ({ readings, graphType, selectedNode }) => {
  // Add debugging on component mount or updates
  useEffect(() => {
    console.log("PowerGraph received readings:", readings);
    console.log("Number of readings:", readings.length);
    console.log("Selected node:", selectedNode);
    console.log("Graph type:", graphType);
  }, [readings, graphType, selectedNode]);

  // Format data for the chart
  const formatData = () => {
    if (!readings || readings.length === 0) {
      console.log("No readings data available to format");
      return [];
    }
    
    try {
      // Sort by timestamp (oldest first for the chart)
      const sortedData = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Adaptive resolution: If we have too many points, we can sample based on date range
      const totalPoints = sortedData.length;
      let dataToRender = sortedData;
      
      // For extremely large datasets, use adaptive sampling
      if (totalPoints > 1000) {
        // Calculate a sampling rate that's proportional to the data size
        const samplingRate = Math.ceil(totalPoints / 1000);
        console.log(`Large dataset detected (${totalPoints} points). Using adaptive sampling rate: 1:${samplingRate}`);
        dataToRender = sortedData.filter((_, index) => index % samplingRate === 0);
      }
      
      return dataToRender.map(reading => ({
        time: new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullTimestamp: reading.timestamp,
        [graphType === 'powerFactor' ? 'powerFactor' : graphType]: 
          graphType === 'powerFactor' ? reading.power_factor : reading[graphType],
        is_anomaly: reading.is_anomaly
      }));
    } catch (err) {
      console.error("Error formatting data:", err);
      return [];
    }
  };

  // Get units for display
  const getUnit = () => {
    switch (graphType) {
      case 'voltage': return 'V';
      case 'current': return 'A';
      case 'power': return 'W';
      case 'frequency': return 'Hz';
      case 'powerFactor': return '';
      default: return '';
    }
  };

  const chartData = formatData();
  const unit = getUnit();
  
  // Return an HTMLCanvas chart instead of Recharts
  return (
    <div className="power-graph-container">
      <div className="canvas-container">
        <h4>Data Summary for {selectedNode}</h4>
        <p>Total readings received: {readings.length}</p>
        <p>Processed data points: {chartData.length}</p>
        <p>Displaying: {graphType === 'powerFactor' ? 'Power Factor' : graphType}</p>
        
        {chartData.length > 0 ? (
          <>
            <p>Time Range: {new Date(chartData[0].fullTimestamp).toLocaleString()} - {new Date(chartData[chartData.length-1].fullTimestamp).toLocaleString()}</p>
            
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>{graphType === 'powerFactor' ? 'Power Factor' : graphType} ({unit})</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice(0, 10).map((reading, index) => (
                    <tr key={index} className={reading.is_anomaly ? 'anomaly-row' : ''}>
                      <td>{new Date(reading.fullTimestamp).toLocaleTimeString()}</td>
                      <td>{graphType === 'powerFactor' ? reading.powerFactor : reading[graphType]}</td>
                    </tr>
                  ))}
                  {chartData.length > 10 && (
                    <tr>
                      <td colSpan="2">... and {chartData.length - 10} more points</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="no-data-message">
            <p>No data to display. Please check the following:</p>
            <ul>
              <li>Verify the Firebase database URL is correct: <br/>
              <code>https://powerquality-d9f8e-default-rtdb.asia-southeast1.firebasedatabase.app/{selectedNode}/2025/03/10</code></li>
              <li>Confirm data exists for the selected node: {selectedNode}</li>
              <li>Try a different date range</li>
              <li>Check browser console for errors</li>
            </ul>
          </div>
        )}
        
        <p className="chart-note">
          Note: Full chart rendering temporarily disabled due to React compatibility issue.
          Please check the summary data above.
        </p>
      </div>
    </div>
  );
};

export default PowerGraph;