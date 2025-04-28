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
    
    const totalReadings = readings.length;
    const overallPercentage = ((anomalyCount / totalReadings) * 100).toFixed(2);
    
    // Calculate percentages for each parameter type
    const voltagePercentage = ((anomalySummary.voltage / totalReadings) * 100).toFixed(2);
    const currentPercentage = ((anomalySummary.current / totalReadings) * 100).toFixed(2);
    const powerPercentage = ((anomalySummary.power / totalReadings) * 100).toFixed(2);
    const frequencyPercentage = ((anomalySummary.frequency / totalReadings) * 100).toFixed(2);
    const powerFactorPercentage = ((anomalySummary.power_factor / totalReadings) * 100).toFixed(2);
    
    // Collect rare anomaly parameters (< 0.05%)
    const rareParameters = [];
    
    if (anomalySummary.frequency > 0 && anomalySummary.frequency / totalReadings < 0.0005) {
      rareParameters.push("frequency");
    }
    
    if (anomalySummary.current > 0 && anomalySummary.current / totalReadings < 0.0005) {
      rareParameters.push("current");
    }
    
    if (anomalySummary.power > 0 && anomalySummary.power / totalReadings < 0.0005) {
      rareParameters.push("power");
    }
    
    // Create an HTML-formatted string that will be rendered properly in the modal
    let modalContent = `
      <div class="anomaly-summary">
        ${anomalyCount} anomalies detected out of ${totalReadings} total readings (${overallPercentage}%).
      </div>
      
      <h4>Anomalies by parameter type:</h4>
      <table class="parameter-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Voltage</td>
            <td>${anomalySummary.voltage}</td>
            <td>${voltagePercentage}%</td>
          </tr>
          <tr>
            <td>Current</td>
            <td>${anomalySummary.current}</td>
            <td>${currentPercentage}%</td>
          </tr>
          <tr>
            <td>Power</td>
            <td>${anomalySummary.power}</td>
            <td>${powerPercentage}%</td>
          </tr>
          <tr>
            <td>Frequency</td>
            <td>${anomalySummary.frequency}</td>
            <td>${frequencyPercentage}%</td>
          </tr>
          <tr>
            <td>Power Factor</td>
            <td>${anomalySummary.power_factor}</td>
            <td>${powerFactorPercentage}%</td>
          </tr>
        </tbody>
      </table>
    `;
    
    // Add note for rare parameters
    if (rareParameters.length > 0) {
      const parameterList = rareParameters.join(", ");
      modalContent += `
        <div class="note-box">
          <strong>Note:</strong> ${parameterList.charAt(0).toUpperCase() + parameterList.slice(1)} anomalies represent less than 0.05% of the total data. These rare events may not be visible in main plots due to sampling but are recorded in the analysis.
        </div>
      `;
    }
    
    // Add conclusion
    modalContent += `
      <div class="conclusion">
        Anomalies indicate measurements outside normal operating parameters and may require investigation.
      </div>
    `;
    
    return modalContent;
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