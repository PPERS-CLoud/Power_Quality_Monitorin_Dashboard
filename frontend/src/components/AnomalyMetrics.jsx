import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const AnomalyMetrics = ({ readings = [], onModalOpen, isProcessing = false }) => {
  // Use memoization for performance
  const { anomalyCount, anomalySummary, severityLevel } = useMemo(() => {
    // Filter anomalies
    const anomalies = readings.filter(r => r.is_anomaly);
    const count = anomalies.length;
    
    // Create summary of anomaly parameters
    const summary = {
      voltage: 0,
      current: 0,
      power: 0,
      frequency: 0,
      power_factor: 0
    };
    
    // Count parameter-specific anomalies
    anomalies.forEach(a => {
      if (Array.isArray(a.anomaly_parameters)) {
        a.anomaly_parameters.forEach(param => {
          if (param in summary) summary[param]++;
        });
      }
    });
    
    // Determine severity level
    let severity = 'none';
    const anomalyPercentage = readings.length > 0 ? (count / readings.length) * 100 : 0;
    
    if (anomalyPercentage === 0) severity = 'none';
    else if (anomalyPercentage < 5) severity = 'low';
    else if (anomalyPercentage < 15) severity = 'medium';
    else severity = 'high';
    
    return { anomalyCount: count, anomalySummary: summary, severityLevel: severity };
  }, [readings]);
  
  const getModalContent = () => {
    if (anomalyCount === 0) {
      return "No anomalies detected in the selected data range.";
    }
    
    return `
      ${anomalyCount} anomalies detected based on threshold criteria.
      
      Anomalies by parameter type:
      - Voltage anomalies: ${anomalySummary.voltage}
      - Current anomalies: ${anomalySummary.current}
      - Power anomalies: ${anomalySummary.power}
      - Frequency anomalies: ${anomalySummary.frequency}
      - Power Factor anomalies: ${anomalySummary.power_factor}
      
      Anomalies indicate measurements outside normal operating parameters and may require investigation.
    `;
  };
  
  return (
    <div className="metric-card large bg-gray">
      <h3>Number of Anomalies</h3>
      <p className="metric-value">
        {anomalyCount}
        {anomalyCount > 0 && (
          <span className={`severity-indicator ${severityLevel}`}>
            {severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1)} Severity
          </span>
        )}
      </p>
      <div className="card-icon">
        <FontAwesomeIcon 
          icon={faExclamationCircle} 
          style={{ 
            color: severityLevel === 'high' ? '#e53e3e' : 
                   severityLevel === 'medium' ? '#dd6b20' : 
                   severityLevel === 'low' ? '#d69e2e' : '#a0aec0' 
          }}
        />
      </div>
      <div className="more-info" onClick={() => onModalOpen("Parameter-Specific Anomaly Analysis", getModalContent())}>
        More info &gt;
      </div>
    </div>
  );
};

export default AnomalyMetrics;