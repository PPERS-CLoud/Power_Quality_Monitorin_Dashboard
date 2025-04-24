import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, Scatter, Brush, ResponsiveContainer
} from 'recharts';
import '../css/PowerGraph.css';

// Custom dot component to highlight anomalies
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  
  if (payload && payload.is_anomaly) {
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={5} 
        fill="#ff6b6b" 
        stroke="#e53e3e"
        strokeWidth={2}
      />
    );
  }
  
  // Regular data points are rendered by default
  return null;
};

const PowerGraph = ({ readings, graphType, selectedNode }) => {
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0 });
  
  // Format data for the chart - moved to useEffect to avoid recalculating on every render
  useEffect(() => {
    console.log("PowerGraph received readings:", readings?.length || 0);
    console.log("Selected node:", selectedNode);
    console.log("Graph type:", graphType);
    
    // Define formatData inside useEffect to avoid stale closures
    const formatData = () => {
      if (!readings || readings.length === 0) {
        console.log("No readings data available to format");
        return [];
      }
      
      try {
        // Sort by timestamp (oldest first for the chart)
        const sortedData = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Adaptive resolution: If we have too many points, sample based on data size
        const totalPoints = sortedData.length;
        let dataToRender = sortedData;
        
        // For extremely large datasets, use more aggressive sampling
        if (totalPoints > 10000) {
          const samplingRate = Math.ceil(totalPoints / 500);
          console.log(`Very large dataset detected (${totalPoints} points). Using sampling rate: 1:${samplingRate}`);
          dataToRender = sortedData.filter((_, index) => index % samplingRate === 0);
        } else if (totalPoints > 1000) {
          const samplingRate = Math.ceil(totalPoints / 1000);
          console.log(`Large dataset detected (${totalPoints} points). Using sampling rate: 1:${samplingRate}`);
          dataToRender = sortedData.filter((_, index) => index % samplingRate === 0);
        }
        
        return dataToRender.map(reading => ({
          // Include date information in the time display
          time: new Date(reading.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fullTime: new Date(reading.timestamp).toLocaleString(), // Full date and time
          fullTimestamp: reading.timestamp,
          [graphType]: graphType === 'powerFactor' ? reading.power_factor : reading[graphType],
          is_anomaly: reading.is_anomaly
        }));
      } catch (err) {
        console.error("Error formatting data:", err);
        return [];
      }
    };
    
    // Calculate statistics for the dataset
    const calculateStats = (data) => {
      if (!data || data.length === 0) return { min: 0, max: 0, avg: 0 };
      
      const values = data.map(item => item[graphType]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      return { 
        min: parseFloat(min.toFixed(2)), 
        max: parseFloat(max.toFixed(2)), 
        avg: parseFloat(avg.toFixed(2)) 
      };
    };
    
    // Process data and update state
    const formattedData = formatData();
    setChartData(formattedData);
    setStats(calculateStats(formattedData));
  }, [readings, graphType, selectedNode]);

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

  const unit = getUnit();

  // Get color based on power parameter type
  const getLineColor = () => {
    switch (graphType) {
      case 'voltage': return '#3182CE'; // blue
      case 'current': return '#DD6B20'; // orange
      case 'power': return '#38A169';   // green
      case 'frequency': return '#805AD5'; // purple
      case 'powerFactor': return '#D53F8C'; // pink
      default: return '#38A169'; // default green
    }
  };

  // Calculate fixed domain range for Y axis based on graph type
  const getYAxisDomain = () => {
    switch (graphType) {
      case 'voltage':
        return [200, 250]; // Standard voltage range for residential power
      case 'current':
        return [0, 20]; // Typical current range in Amperes
      case 'power':
        return [0, 500]; // Adjusted power range based on the image (0-500W)
      case 'frequency':
        return [59, 61]; // Frequency range around 60Hz
      case 'powerFactor':
        return [0, 1]; // Power factor range from 0 to 1
      default:
        return [0, 100]; // Default range
    }
  };

  return (
    <div className="power-graph-container">
      {chartData.length > 0 ? (
        <div className="two-column-layout">
          {/* First Column - Stats and Anomalies */}
          <div className="stats-column">
            <h3 className="stats-title">Statistics</h3>
            <div className="graph-stats">
              <div className="stat-item">
                <h4>Min</h4>
                <p>{stats.min} {unit}</p>
              </div>
              <div className="stat-item">
                <h4>Average</h4>
                <p>{stats.avg} {unit}</p>
              </div>
              <div className="stat-item">
                <h4>Max</h4>
                <p>{stats.max} {unit}</p>
              </div>
              <div className="stat-item">
                <h4>Data Points</h4>
                <p>{chartData.length}</p>
              </div>
              {chartData.filter(d => d?.is_anomaly).length > 0 && (
                <div className="stat-item anomaly-stat">
                  <h4>Anomalies</h4>
                  <p>{chartData.filter(d => d?.is_anomaly).length}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Second Column - Graph */}
          <div className="graph-column">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }} // Adjusted left margin to extend graph
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
                  <XAxis 
                    dataKey="time" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fontSize: 10 }}
                    interval={Math.floor(chartData.length / 10)}
                  />
                  <YAxis
                    domain={getYAxisDomain()}
                    label={{ 
                      value: `${graphType.charAt(0).toUpperCase() + graphType.slice(1)} (${unit})`, 
                      angle: -90, 
                      position: 'insideLeft',
                      offset: -20
                    }}
                    allowDataOverflow={true}
                    width={60}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} ${unit}`, graphType.charAt(0).toUpperCase() + graphType.slice(1)]}
                    labelFormatter={(time) => {
                      const dataPoint = chartData.find(d => d.time === time);
                      return dataPoint ? `Time: ${dataPoint.fullTime}` : time;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={graphType}
                    stroke={getLineColor()}
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                  <Scatter 
                    data={chartData.filter(d => d?.is_anomaly)} 
                    fill="#ff6b6b" 
                    shape={<CustomDot />}
                  />
                  <Legend 
                    align="center" 
                    verticalAlign="top" 
                    height={36}
                    payload={[
                      { value: graphType.charAt(0).toUpperCase() + graphType.slice(1), type: 'line', color: getLineColor() },
                      ...(chartData.some(d => d?.is_anomaly) ? [{ value: 'Anomalies', type: 'circle', color: '#ff6b6b' }] : [])
                    ]}
                  />
                  <Brush dataKey="time" height={20} stroke={getLineColor()} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data-message">
          <p>No data to display. Please check the following:</p>
          <ul>
            <li>Verify the Firebase database URL is correct</li>
            <li>Confirm data exists for the selected node: {selectedNode}</li>
            <li>Try a different date range</li>
            <li>Check browser console for errors</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PowerGraph;