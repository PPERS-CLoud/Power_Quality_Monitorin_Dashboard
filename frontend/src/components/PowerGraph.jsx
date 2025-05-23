import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, Scatter, Brush, ResponsiveContainer
} from 'recharts';
import '../css/PowerGraph.css';

// Custom dot component to highlight parameter-specific anomalies
const CustomDot = (props) => {
  const { cx, cy, payload, graphType } = props;
  
  // Convert graphType to backend parameter name format (e.g. powerFactor to power_factor)
  const paramName = graphType === 'powerFactor' ? 'power_factor' : graphType;
  
  // Check if this specific parameter is anomalous
  const isParamAnomalous = payload && 
                          payload.is_anomaly && 
                          payload.anomaly_parameters && 
                          payload.anomaly_parameters.includes(paramName);
  
  if (isParamAnomalous) {
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

// Custom dot renderer for Line component
const LineDot = (props) => {
  const { cx, cy, payload, fill, stroke, graphType } = props;
  
  // Convert graphType to backend parameter name format
  const paramName = graphType === 'powerFactor' ? 'power_factor' : graphType;
  
  // Check if this specific parameter is anomalous
  const isParamAnomalous = payload && 
                          payload.is_anomaly && 
                          payload.anomaly_parameters && 
                          payload.anomaly_parameters.includes(paramName);
  
  // Use red for parameter-specific anomalous points, default color for normal points
  const dotColor = isParamAnomalous ? "#ff6b6b" : fill || stroke;
  const dotStroke = isParamAnomalous ? "#e53e3e" : stroke;
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={3} 
      fill={dotColor}
      stroke={dotStroke}
      strokeWidth={1}
    />
  );
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
        
        // Get parameter name for anomaly checking
        const paramName = graphType === 'powerFactor' ? 'power_factor' : graphType;
        
        // Count original anomaly proportion for this specific parameter
        const originalAnomalies = sortedData.filter(d => 
          d?.is_anomaly && d?.anomaly_parameters && d.anomaly_parameters.includes(paramName)
        );
        const regularData = sortedData.filter(d => 
          !(d?.is_anomaly && d?.anomaly_parameters && d.anomaly_parameters.includes(paramName))
        );
        
        const totalPoints = sortedData.length;
        const originalAnomalyCount = originalAnomalies.length;
        const originalProportion = originalAnomalyCount / totalPoints;
        
        console.log(`Original data: ${originalAnomalyCount}/${totalPoints} anomalies (${(originalProportion * 100).toFixed(2)}%)`);
        
        let dataToRender = sortedData;
        
        // For large datasets, use reservoir sampling with stratification
        if (totalPoints > 500) {
          const targetPoints = totalPoints > 10000 ? 500 : 1000;
          console.log(`Large dataset detected (${totalPoints} points). Targeting ~${targetPoints} points with stratified sampling.`);
          
          // IMPORTANT: Preserve the exact same proportion in sampled data
          const targetAnomalyCount = Math.round(targetPoints * originalProportion);
          const targetRegularCount = targetPoints - targetAnomalyCount;
          
          console.log(`Target distribution: ${targetAnomalyCount} anomalies (${(originalProportion * 100).toFixed(2)}%) and ${targetRegularCount} regular points`);
          
          // Use reservoir sampling for both anomalous and regular points
          const sampledAnomalies = reservoirSample(originalAnomalies, targetAnomalyCount);
          const sampledRegular = reservoirSample(regularData, targetRegularCount);
          
          // Combine and sort chronologically
          dataToRender = [...sampledAnomalies, ...sampledRegular]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          // Log final proportions
          const finalAnomalies = dataToRender.filter(d => 
            d?.is_anomaly && d?.anomaly_parameters && d.anomaly_parameters.includes(paramName)
          ).length;
          const finalProportion = finalAnomalies / dataToRender.length;
          
          console.log(`Final sampled data: ${finalAnomalies}/${dataToRender.length} anomalies (${(finalProportion * 100).toFixed(2)}%)`);
        }
        
        return dataToRender.map(reading => ({
          // Map fields for chart display - existing mapping code
          time: new Date(reading.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fullTime: new Date(reading.timestamp).toLocaleString(),
          fullTimestamp: reading.timestamp,
          [graphType]: graphType === 'powerFactor' ? reading.power_factor : reading[graphType],
          is_anomaly: reading.is_anomaly,
          anomaly_parameters: reading.anomaly_parameters || [],
          isParamAnomalous: reading.is_anomaly && 
                           reading.anomaly_parameters && 
                           reading.anomaly_parameters.includes(paramName)
        }));
      } catch (err) {
        console.error("Error formatting data:", err);
        return [];
      }
    };
    
    // Helper function: Reservoir sampling algorithm - provides uniform random sampling without bias
    const reservoirSample = (array, sampleSize) => {
      if (array.length <= sampleSize) {
        return [...array]; // Return all elements if we need more than exist
      }
      
      // Initialize reservoir with first sampleSize elements
      const result = array.slice(0, sampleSize);
      
      // Replace elements with gradually decreasing probability
      for (let i = sampleSize; i < array.length; i++) {
        // Random index in reservoir
        const j = Math.floor(Math.random() * (i + 1));
        // Replace element if random index is within reservoir
        if (j < sampleSize) {
          result[j] = array[i];
        }
      }
      
      return result;
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
      case 'power': {
        // Dynamic calculation for power based on actual maximum
        const upperBound = Math.ceil(stats.max * 1.1);
        return [0, upperBound];
      }
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
          </div>
        </div>
          
          {/* Second Column - Graph */}
          <div className="graph-column">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
                    allowDataOverflow={false}
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
                    dot={(props) => <LineDot {...props} graphType={graphType} />}
                    isAnimationActive={false}
                  />
                  <Scatter 
                    data={chartData.filter(d => {
                      const paramName = graphType === 'powerFactor' ? 'power_factor' : graphType;
                      return d?.is_anomaly && 
                             d?.anomaly_parameters && 
                             d.anomaly_parameters.includes(paramName);
                    })}
                    fill="#ff6b6b" 
                    shape={(props) => <CustomDot {...props} graphType={graphType} />}
                  />
                  <Legend 
                    align="center" 
                    verticalAlign="top" 
                    height={36}
                    payload={[
                      { value: graphType.charAt(0).toUpperCase() + graphType.slice(1), type: 'line', color: getLineColor() },
                      ...(chartData.some(d => {
                        const paramName = graphType === 'powerFactor' ? 'power_factor' : graphType;
                        return d?.is_anomaly && 
                               d?.anomaly_parameters && 
                               d.anomaly_parameters.includes(paramName);
                      }) ? [{ value: `${graphType.charAt(0).toUpperCase() + graphType.slice(1)} Anomalies`, type: 'circle', color: '#ff6b6b' }] : [])
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