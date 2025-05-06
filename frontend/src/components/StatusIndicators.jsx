import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faSpinner 
} from '@fortawesome/free-solid-svg-icons';

const StatusIndicators = ({
  dateRangeWarning,
  dataLoadProgress,
  daysLoaded,
  totalDays,
  currentLoadingDate,
  isProcessingAnomalies,
  anomalyProgress,
  nodeDateRangeInfo,
  selectedNode
}) => {
  return (
    <>
      {/* Warning and Progress Bar */}
      {dateRangeWarning && (
        <div className="date-range-warning">
          <FontAwesomeIcon icon={faExclamationTriangle} /> {dateRangeWarning}
        </div>
      )}
      
      {dataLoadProgress > 0 && dataLoadProgress < 100 && (
        <div className="data-loading-controls">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${dataLoadProgress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            Loading data: {Math.round(dataLoadProgress)}% complete 
            ({daysLoaded}/{totalDays} days) - Current: {currentLoadingDate || ''}
          </div>
        </div>
      )}
      
      {/* Background Processing Indicator */}
      {isProcessingAnomalies && (
        <div className="background-process-indicator">
          <div className="background-process-content">
            <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
            <span>Analyzing anomalies in background: {anomalyProgress}% complete</span>
          </div>
          <div className="progress-bar-container mini">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${anomalyProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusIndicators;