import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';

/**
 * Component that evaluates and displays power quality status based on ALL readings
 * 
 * @param {Object} props - Component props
 * @param {Array} props.readings - Array of power reading objects
 * @param {Object} props.latestReading - Most recent power reading
 * @param {Object} props.thresholds - Quality thresholds configuration
 * @param {string} props.method - Quality evaluation method ('anomaly', 'voltage', 'combined')
 * @param {Function} props.onModalOpen - Function to open a modal with more information
 */
const PowerQualityStatus = ({ 
  readings = [],
  latestReading = null,
  thresholds = {
    voltage: { min: 218.51, max: 241.49, ideal: { min: 220, max: 240 } },
    frequency: { min: 59.5, max: 60.5, ideal: { min: 59.8, max: 60.2 } },
    powerFactor: { min: 0.8, ideal: 0.95 }
  },
  method = 'anomaly',
  onModalOpen
}) => {
  
  // Evaluate power quality based on the selected method using ALL readings
  const { qualityLevel, reason, stats } = useMemo(() => {
    // Return early if no readings available
    if (!readings || readings.length === 0) {
      return { 
        qualityLevel: 'good', 
        reason: "No readings available",
        stats: { total: 0 }
      };
    }

    // Use all readings for comprehensive analysis
    const totalReadings = readings.length;
    
    // Initialize statistics tracking
    const stats = {
      total: totalReadings,
      analyzed: totalReadings,
      anomalies: 0,
      outOfRangeVoltage: 0,
      outOfRangeFrequency: 0,
      poorPowerFactor: 0,
      outOfIdealVoltage: 0,
      outOfIdealFrequency: 0,
      belowIdealPowerFactor: 0
    };

    // Count anomalies across all readings
    stats.anomalies = readings.filter(reading => reading.is_anomaly).length;
    
    // Calculate anomaly percentage
    const anomalyPercentage = totalReadings > 0 ? (stats.anomalies / totalReadings) * 100 : 0;
    
    // Calculate quality metrics for ALL readings
    readings.forEach(reading => {
      // Voltage checks
      if (reading.voltage < thresholds.voltage.min || reading.voltage > thresholds.voltage.max) {
        stats.outOfRangeVoltage++;
      } else if (reading.voltage < thresholds.voltage.ideal.min || reading.voltage > thresholds.voltage.ideal.max) {
        stats.outOfIdealVoltage++;
      }
      
      // Frequency checks
      if (reading.frequency < thresholds.frequency.min || reading.frequency > thresholds.frequency.max) {
        stats.outOfRangeFrequency++;
      } else if (reading.frequency < thresholds.frequency.ideal.min || reading.frequency > thresholds.frequency.ideal.max) {
        stats.outOfIdealFrequency++;
      }
      
      // Power factor checks
      if (reading.power_factor < thresholds.powerFactor.min) {
        stats.poorPowerFactor++;
      } else if (reading.power_factor < thresholds.powerFactor.ideal) {
        stats.belowIdealPowerFactor++;
      }
    });
    
    // Calculate percentages for all readings
    const voltageOutOfRangePercent = (stats.outOfRangeVoltage / totalReadings) * 100;
    const frequencyOutOfRangePercent = (stats.outOfRangeFrequency / totalReadings) * 100;
    const poorPowerFactorPercent = (stats.poorPowerFactor / totalReadings) * 100;
    
    const voltageOutOfIdealPercent = (stats.outOfIdealVoltage / totalReadings) * 100;
    const frequencyOutOfIdealPercent = (stats.outOfIdealFrequency / totalReadings) * 100;
    const belowIdealPowerFactorPercent = (stats.belowIdealPowerFactor / totalReadings) * 100;
    
    // Different evaluation methods - same logic but now using all readings
    switch (method) {
      case 'anomaly':
        // Evaluate based on anomaly percentage
        if (anomalyPercentage > 50) {
          return { 
            qualityLevel: 'poor', 
            reason: `High anomaly rate: ${anomalyPercentage.toFixed(1)}% of readings flagged as anomalies`,
            stats
          };
        } else if (anomalyPercentage > 10) {
          return { 
            qualityLevel: 'fair', 
            reason: `Elevated anomaly rate: ${anomalyPercentage.toFixed(1)}% of readings flagged as anomalies`,
            stats
          };
        } else {
          return { 
            qualityLevel: 'good', 
            reason: `Low anomaly rate: ${anomalyPercentage.toFixed(1)}% of readings flagged as anomalies`,
            stats
          };
        }

      case 'voltage':
        // Voltage-based evaluation
        if (voltageOutOfRangePercent > 10) {
          return { 
            qualityLevel: 'poor',
            reason: `Voltage outside acceptable range ${voltageOutOfRangePercent.toFixed(1)}% of the time`,
            stats
          };
        } else if (voltageOutOfIdealPercent > 25) {
          return { 
            qualityLevel: 'fair',
            reason: `Voltage outside ideal range ${voltageOutOfIdealPercent.toFixed(1)}% of the time`,
            stats
          };
        } else {
          return { 
            qualityLevel: 'excellent',
            reason: `Voltage maintained within ideal range ${(100-voltageOutOfIdealPercent).toFixed(1)}% of the time`,
            stats
          };
        }
        
      case 'combined':
      default:
        // Comprehensive evaluation based on all parameters
        const anyHighOutOfRange = 
          voltageOutOfRangePercent > 10 || 
          frequencyOutOfRangePercent > 10 || 
          poorPowerFactorPercent > 10;
        
        const anyModerateOutOfRange =
          voltageOutOfRangePercent > 5 || 
          frequencyOutOfRangePercent > 5 || 
          poorPowerFactorPercent > 5;
        
        const allMostlyIdeal =
          voltageOutOfIdealPercent < 15 && 
          frequencyOutOfIdealPercent < 15 && 
          belowIdealPowerFactorPercent < 15;
        
        // Build detailed reason string
        let detailedReason = "";
        
        if (voltageOutOfRangePercent > 0) {
          detailedReason += `Voltage outside range: ${voltageOutOfRangePercent.toFixed(1)}% of time. `;
        }
        if (frequencyOutOfRangePercent > 0) {
          detailedReason += `Frequency outside range: ${frequencyOutOfRangePercent.toFixed(1)}% of time. `;
        }
        if (poorPowerFactorPercent > 0) {
          detailedReason += `Poor power factor: ${poorPowerFactorPercent.toFixed(1)}% of time. `;
        }
        
        // Overall quality level determination
        if (anyHighOutOfRange || anomalyPercentage > 25) {
          return {
            qualityLevel: 'poor',
            reason: `Significant power quality issues detected. ${detailedReason}`,
            stats
          };
        } else if (anyModerateOutOfRange || anomalyPercentage > 10) {
          return {
            qualityLevel: 'fair',
            reason: `Minor power quality issues detected. ${detailedReason}`,
            stats
          };
        } else if (allMostlyIdeal && anomalyPercentage < 5) {
          return {
            qualityLevel: 'excellent',
            reason: "Power quality parameters maintained within ideal ranges consistently.",
            stats
          };
        } else {
          return {
            qualityLevel: 'good',
            reason: "Power quality parameters within acceptable ranges overall.",
            stats
          };
        }
    }
  }, [readings, method, thresholds]);

  // Determine card background color based on quality
  const cardBgClass = qualityLevel === 'poor' ? 'bg-red' : 
                      qualityLevel === 'fair' ? 'bg-yellow' : 
                      qualityLevel === 'excellent' ? 'bg-green' : 'bg-green';

  // Format additional modal content
  const getModalContent = () => {
    // Basic initial content
    let content = `<div class="quality-summary">
      <p><strong>Power Quality Status:</strong> ${qualityLevel.charAt(0).toUpperCase() + qualityLevel.slice(1)}</p>
      <p><strong>Reason:</strong> ${reason}</p>
    </div>`;
    
    // Add statistics if available
    if (stats && stats.total > 0) {
      content += `<div class="stats-section">
        <h4>Data Analysis</h4>
        <ul>
          <li>Total readings analyzed: ${stats.total.toLocaleString()}</li>
          <li>Anomalies detected: ${stats.anomalies.toLocaleString()} (${((stats.anomalies/stats.total)*100).toFixed(2)}%)</li>
        </ul>
        
        <h4>Parameter Performance</h4>
        <p>Analysis based on all ${stats.analyzed.toLocaleString()} readings:</p>
        <table class="parameter-table">
          <tr>
            <th>Parameter</th>
            <th>Out of Range</th>
            <th>Outside Ideal</th>
          </tr>
          <tr>
            <td>Voltage</td>
            <td>${stats.outOfRangeVoltage.toLocaleString()} (${((stats.outOfRangeVoltage/stats.analyzed)*100).toFixed(1)}%)</td>
            <td>${stats.outOfIdealVoltage.toLocaleString()} (${((stats.outOfIdealVoltage/stats.analyzed)*100).toFixed(1)}%)</td>
          </tr>
          <tr>
            <td>Frequency</td>
            <td>${stats.outOfRangeFrequency.toLocaleString()} (${((stats.outOfRangeFrequency/stats.analyzed)*100).toFixed(1)}%)</td>
            <td>${stats.outOfIdealFrequency.toLocaleString()} (${((stats.outOfIdealFrequency/stats.analyzed)*100).toFixed(1)}%)</td>
          </tr>
          <tr>
            <td>Power Factor</td>
            <td>${stats.poorPowerFactor.toLocaleString()} (${((stats.poorPowerFactor/stats.analyzed)*100).toFixed(1)}%)</td>
            <td>${stats.belowIdealPowerFactor.toLocaleString()} (${((stats.belowIdealPowerFactor/stats.analyzed)*100).toFixed(1)}%)</td>
          </tr>
        </table>
      </div>`;
    }
    
    // Add thresholds information
    content += `<div class="thresholds-section">
      <h4>Quality Thresholds</h4>
      <table class="parameter-table">
        <tr>
          <th>Parameter</th>
          <th>Acceptable Range</th>
          <th>Ideal Range</th>
        </tr>
        <tr>
          <td>Voltage</td>
          <td>${thresholds.voltage.min}V - ${thresholds.voltage.max}V</td>
          <td>${thresholds.voltage.ideal.min}V - ${thresholds.voltage.ideal.max}V</td>
        </tr>
        <tr>
          <td>Frequency</td>
          <td>${thresholds.frequency.min}Hz - ${thresholds.frequency.max}Hz</td>
          <td>${thresholds.frequency.ideal.min}Hz - ${thresholds.frequency.ideal.max}Hz</td>
        </tr>
        <tr>
          <td>Power Factor</td>
          <td>≥ ${thresholds.powerFactor.min}</td>
          <td>≥ ${thresholds.powerFactor.ideal}</td>
        </tr>
      </table>
    </div>`;
    
    return content;
  };

  return (
    <div className={`metric-card large ${cardBgClass} power-quality-card`}>
      <h3>Power Quality Status</h3>
      <p className="metric-value">
        <span className={`status-indicator ${qualityLevel}`}>
          {qualityLevel === 'excellent' ? 'Excellent' : 
          qualityLevel === 'good' ? 'Good' : 
          qualityLevel === 'fair' ? 'Fair' : 'Poor'}
        </span>
      </p>
      <div className="card-icon">
        <FontAwesomeIcon icon={faBolt} />
      </div>
      <div className="more-info" onClick={() => onModalOpen("Power Quality Analysis", getModalContent())}>
        More info &gt;
      </div>
    </div>
  );
};

export default PowerQualityStatus;