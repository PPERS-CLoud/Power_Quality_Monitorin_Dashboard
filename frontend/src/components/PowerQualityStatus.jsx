import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';

/**
 * Component that evaluates and displays power quality status
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
  
  // Evaluate power quality based on the selected method
  const { qualityLevel, reason } = useMemo(() => {
    if (!latestReading) {
      return { qualityLevel: 'good', reason: "No readings available" };
    }

    // Different evaluation methods
    switch (method) {
      case 'anomaly':
        // Simple method: just use the is_anomaly flag
        if (latestReading.is_anomaly) {
          return { qualityLevel: 'poor', reason: "Anomaly detected" };
        } else {
          return { qualityLevel: 'good', reason: "No anomalies detected" };
        }

      case 'voltage':
        // Voltage-based evaluation with three levels
        const voltage = latestReading.voltage;
        
        if (voltage >= thresholds.voltage.ideal.min && voltage <= thresholds.voltage.ideal.max) {
          return { 
            qualityLevel: 'excellent',
            reason: `Voltage (${voltage}V) within ideal range`
          };
        } else if (voltage >= thresholds.voltage.min && voltage <= thresholds.voltage.max) {
          return { 
            qualityLevel: 'good',
            reason: `Voltage (${voltage}V) within acceptable range, but outside ideal range`
          };
        } else {
          return { 
            qualityLevel: 'poor',
            reason: `Voltage (${voltage}V) outside normal range`
          };
        }
        
      case 'combined':
        // Comprehensive evaluation using multiple parameters with three quality levels
        const voltageValue = latestReading.voltage;
        const frequencyValue = latestReading.frequency;
        const powerFactorValue = latestReading.power_factor;
        
        // Check if values are in ideal ranges
        const voltageIdeal = (
          voltageValue >= thresholds.voltage.ideal.min && 
          voltageValue <= thresholds.voltage.ideal.max
        );
        
        const frequencyIdeal = (
          frequencyValue >= thresholds.frequency.ideal.min && 
          frequencyValue <= thresholds.frequency.ideal.max
        );
        
        const powerFactorIdeal = powerFactorValue >= thresholds.powerFactor.ideal;
        
        // Check if values are in acceptable ranges
        const voltageOk = (
          voltageValue >= thresholds.voltage.min && 
          voltageValue <= thresholds.voltage.max
        );
        
        const frequencyOk = (
          frequencyValue >= thresholds.frequency.min && 
          frequencyValue <= thresholds.frequency.max
        );
        
        const powerFactorOk = powerFactorValue >= thresholds.powerFactor.min;
        
        // All parameters must be at least in acceptable range
        const allParamsOk = voltageOk && frequencyOk && powerFactorOk;
        
        // All parameters must be in ideal range for excellent
        const allParamsIdeal = voltageIdeal && frequencyIdeal && powerFactorIdeal;
        
        let combinedReason = "";
        
        if (!voltageOk) combinedReason += "Voltage out of range. ";
        if (!frequencyOk) combinedReason += "Frequency out of range. ";
        if (!powerFactorOk) combinedReason += "Poor power factor. ";
        
        if (allParamsIdeal) {
          return {
            qualityLevel: 'excellent',
            reason: "All parameters within ideal range"
          };
        } else if (allParamsOk) {
          return {
            qualityLevel: 'good',
            reason: "All parameters within acceptable range"
          };
        } else {
          return {
            qualityLevel: 'poor',
            reason: combinedReason || "One or more parameters out of range"
          };
        }
        
      default:
        return { 
          qualityLevel: 'good',
          reason: "Using default quality assessment" 
        };
    }
  }, [latestReading, method, thresholds]);

  return (
    <div className="metric-card large bg-green">
      <h3>Power Quality Status</h3>
      <p className="metric-value">
        <span className={`status-indicator ${qualityLevel}`}>
          {qualityLevel === 'excellent' ? 'Excellent' : qualityLevel === 'good' ? 'Good' : 'Poor'}
        </span>
      </p>
      <div className="card-icon">
        <FontAwesomeIcon icon={faBolt} />
      </div>
      <div className="more-info" onClick={() => onModalOpen("Power Quality Status", 
        `Power quality is determined by monitoring voltage, current, and frequency levels. ${reason}`)}
      >
        More info &gt;
      </div>
    </div>
  );
};

export default PowerQualityStatus;