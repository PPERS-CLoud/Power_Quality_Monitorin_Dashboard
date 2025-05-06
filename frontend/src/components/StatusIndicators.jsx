import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faSpinner,
  faDatabase,
  faCalendarDay 
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
  // State for animated progress counter
  const [displayProgress, setDisplayProgress] = useState(0);
  const prevProgressRef = useRef(0);
  const animationFrameRef = useRef(null);
  
  // Smooth progress animation
  useEffect(() => {
    if (dataLoadProgress === 0 || dataLoadProgress === 100) {
      setDisplayProgress(dataLoadProgress);
      return;
    }
    
    // Cancel any running animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const startValue = prevProgressRef.current;
    const endValue = dataLoadProgress;
    const duration = 500; // Animation duration in ms
    const startTime = performance.now();
    
    // Function to animate the counter
    const animateProgress = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic function for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current value
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayProgress(Math.round(currentValue));
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateProgress);
      } else {
        prevProgressRef.current = endValue;
      }
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animateProgress);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dataLoadProgress]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Activity indicator dots
  const ActivityDots = () => (
    <span className="loading-activity-indicator">
      {[...Array(3)].map((_, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.3}s` }}>.</span>
      ))}
    </span>
  );

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
          <div className="loading-header">
            <FontAwesomeIcon icon={faDatabase} className="loading-icon" />
            <div className="loading-title">
              Loading data: <span className="progress-percentage">{displayProgress}%</span> complete
              <span className="day-counter">({daysLoaded}/{totalDays} days)</span>
              <ActivityDots />
            </div>
          </div>
          
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${dataLoadProgress}%` }}
              aria-valuenow={dataLoadProgress} 
              aria-valuemin="0" 
              aria-valuemax="100"
            ></div>
          </div>
          
          {currentLoadingDate && (
            <div className="current-day-info">
              <FontAwesomeIcon icon={faCalendarDay} className="calendar-icon" />
              <span>Current: <strong>{currentLoadingDate || ''}</strong></span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default StatusIndicators;