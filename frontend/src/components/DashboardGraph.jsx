import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import PowerGraph from './PowerGraph';

const DashboardGraph = ({
  graphType,
  selectedNode,
  isProcessingAnomalies,
  handleGraphTypeChange,
  isLoading,
  readings,
  dataLoadProgress
}) => {
  return (
    <div className="graph-card">
      <div className="graph-header">
        <h3>
          {graphType === 'powerFactor' 
              ? 'Power Factor Over Time'
              : graphType.charAt(0).toUpperCase() + graphType.slice(1) + ' Over Time'} 
          <span className="selected-node">- Node {selectedNode}</span>
          {isProcessingAnomalies && (
            <span className="analyzing-tag"> (Analyzing anomalies...)</span>
          )}
        </h3>            
        <div className="graph-controls">
          <button 
            className={`graph-type-button ${graphType === 'voltage' ? 'active' : ''}`} 
            onClick={() => handleGraphTypeChange('voltage')}
          >
            Voltage
          </button>
          <button 
            className={`graph-type-button ${graphType === 'current' ? 'active' : ''}`} 
            onClick={() => handleGraphTypeChange('current')}
          >
            Current
          </button>
          <button 
            className={`graph-type-button ${graphType === 'power' ? 'active' : ''}`} 
            onClick={() => handleGraphTypeChange('power')}
          >
            Power
          </button>
          <button 
            className={`graph-type-button ${graphType === 'frequency' ? 'active' : ''}`} 
            onClick={() => handleGraphTypeChange('frequency')}
          >
            Frequency
          </button>
          <button 
            className={`graph-type-button ${graphType === 'powerFactor' ? 'active' : ''}`} 
            onClick={() => handleGraphTypeChange('powerFactor')}
          >
            Power Factor
          </button>
        </div>
      </div>
      
      <div className="graph-content">
        {isLoading && readings.length === 0 ? (
          <div className="graph-placeholder">
            <div className="loading-spinner-container">
              <FontAwesomeIcon icon={faSpinner} className="spinner-icon" />
              <p>Loading data...</p>
              {dataLoadProgress > 0 && dataLoadProgress < 100 && (
                <p>Progress: {Math.round(dataLoadProgress)}%</p>
              )}
            </div>
          </div>
        ) : readings.length > 0 ? (
          <PowerGraph 
            readings={readings} 
            graphType={graphType} 
            selectedNode={selectedNode} 
          />
        ) : (
          <div className="graph-placeholder">
            <div className="graph-message">
              <p>No data available for {selectedNode} on selected date range.</p>
              <p>Please select a different node or date range.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardGraph;