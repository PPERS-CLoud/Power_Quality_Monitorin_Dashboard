import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHourglass, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * Detects power interruptions in a dataset based on voltage drops
 * @param {Array} data - Array of power reading objects
 * @param {number} voltageThreshold - Voltage level below which is considered an interruption (default: 180V)
 * @param {number} minDurationSec - Minimum duration in seconds to count as an interruption (default: 30s)
 * @returns {Array} Array of interruption objects with start, end, and duration properties
 */
const detectInterruptions = (data, voltageThreshold = 180, minDurationSec = 30) => {
  // Sort by timestamp (oldest first for time-sequential analysis)
  const sortedReadings = [...data].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const interruptions = [];
  let interruptionStart = null;
  let inInterruption = false;
  
  for (let i = 0; i < sortedReadings.length; i++) {
    const reading = sortedReadings[i];
    const isInterrupted = reading.voltage < voltageThreshold;
    
    // Start of a new interruption
    if (isInterrupted && !inInterruption) {
      inInterruption = true;
      interruptionStart = new Date(reading.timestamp);
    }
    
    // End of an interruption
    else if (!isInterrupted && inInterruption) {
      inInterruption = false;
      const interruptionEnd = new Date(reading.timestamp);
      const durationMs = interruptionEnd - interruptionStart;
      const durationSec = durationMs / 1000;
      
      // Only count if duration exceeds minimum threshold
      if (durationSec >= minDurationSec) {
        interruptions.push({
          start: interruptionStart,
          end: interruptionEnd,
          duration: durationSec
        });
      }
    }
  }
  
  // If we're still in an interruption at the end of the data
  if (inInterruption && interruptionStart && sortedReadings.length > 0) {
    // Use the last timestamp as the end
    const lastReading = sortedReadings[sortedReadings.length - 1];
    const interruptionEnd = new Date(lastReading.timestamp);
    const durationMs = interruptionEnd - interruptionStart;
    const durationSec = durationMs / 1000;
    
    if (durationSec >= minDurationSec) {
      interruptions.push({
        start: interruptionStart,
        end: interruptionEnd,
        duration: durationSec,
        ongoing: true
      });
    }
  }
  
  return interruptions;
};

/**
 * Component for displaying power interruption metrics
 * 
 * @param {Object} props - Component props
 * @param {Array} props.readings - Array of power reading objects
 * @param {number} props.voltageThreshold - Voltage level below which is considered an interruption
 * @param {number} props.minDurationSec - Minimum duration in seconds to count as an interruption
 * @param {Function} props.onModalOpen - Function to open a modal with more information
 */
const InterruptionMetrics = ({ 
  readings = [], 
  voltageThreshold = 180, 
  minDurationSec = 30,
  onModalOpen 
}) => {
  // Calculate interruption metrics using memoization to optimize performance
  const { interruptions, avgDurationMin, interruptionCount } = useMemo(() => {
    const detectedInterruptions = detectInterruptions(readings, voltageThreshold, minDurationSec);
    const count = detectedInterruptions.length;
    
    // Calculate average duration in minutes
    let avgMin = 0;
    if (count > 0) {
      const totalDuration = detectedInterruptions.reduce((sum, interruption) => 
        sum + interruption.duration, 0);
      avgMin = parseFloat((totalDuration / count / 60).toFixed(1));
    }
    
    return { 
      interruptions: detectedInterruptions,
      avgDurationMin: avgMin,
      interruptionCount: count
    };
  }, [readings, voltageThreshold, minDurationSec]);

  return (
    <>
      {/* Average Interruption Duration Card */}
      <div className="metric-card large bg-blue">
        <h3>Average Interruption</h3>
        <p className="metric-value">{avgDurationMin} <span className="unit">min</span></p>
        <div className="card-icon">
          <FontAwesomeIcon icon={faHourglass} />
        </div>
        <div className="more-info" onClick={() => onModalOpen("Average Interruption", 
          "The average interruption duration represents the typical length of power outages experienced. Lower values indicate better grid reliability.")}
        >
          More info &gt;
        </div>
      </div>

      {/* Number of Interruptions Card */}
      <div className="metric-card large bg-red">
        <h3>Number of Interruptions</h3>
        <p className="metric-value">{interruptionCount}</p>
        <div className="card-icon">
          <FontAwesomeIcon icon={faTimesCircle} />
        </div>
        <div className="more-info" onClick={() => onModalOpen("Number of Interruptions", 
          "This metric shows how many times the power supply has been interrupted. Frequent interruptions may indicate grid instability or equipment issues.")}
        >
          More info &gt;
        </div>
      </div>
    </>
  );
};

export default InterruptionMetrics;