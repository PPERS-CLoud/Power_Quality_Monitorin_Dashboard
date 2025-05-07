import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHourglass, 
  faTimesCircle, 
  faExclamationTriangle, 
  faInfoCircle, 
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';

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
 * Format seconds into a human-readable duration string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}${remainingSeconds > 0 ? ` ${remainingSeconds} seconds` : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes > 0 ? ` ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : ''}`;
  }
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
  const { interruptions, avgDurationMin, interruptionCount, totalDowntimeMins, longestInterruption, mostRecentInterruption } = useMemo(() => {
    const detectedInterruptions = detectInterruptions(readings, voltageThreshold, minDurationSec);
    const count = detectedInterruptions.length;
    
    // Calculate average duration in minutes
    let avgMin = 0;
    let totalDowntime = 0;
    let longest = null;
    let mostRecent = null;
    
    if (count > 0) {
      // Total duration
      totalDowntime = detectedInterruptions.reduce((sum, interruption) => 
        sum + interruption.duration, 0);
      avgMin = parseFloat((totalDowntime / count / 60).toFixed(1));
      
      // Find longest interruption
      longest = detectedInterruptions.reduce((max, current) => 
        (current.duration > max.duration) ? current : max, detectedInterruptions[0]);
      
      // Find most recent interruption
      mostRecent = detectedInterruptions.reduce((latest, current) => 
        (new Date(current.end) > new Date(latest.end)) ? current : latest, detectedInterruptions[0]);
    }
    
    return { 
      interruptions: detectedInterruptions,
      avgDurationMin: avgMin,
      interruptionCount: count,
      totalDowntimeMins: parseFloat((totalDowntime / 60).toFixed(1)),
      longestInterruption: longest,
      mostRecentInterruption: mostRecent
    };
  }, [readings, voltageThreshold, minDurationSec]);

  // Create detailed content for modals
  const getAverageDurationModalContent = () => {
    let content = `
      <div class="modal-section">
        <h4>Average Interruption Duration: ${avgDurationMin} minutes</h4>
        <p>The average duration represents the typical length of power outages experienced during the selected time period.</p>
        
        <div class="stats-summary">
          <div class="stat-item">
            <span class="stat-label">Total interruptions detected:</span>
            <span class="stat-value">${interruptionCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total downtime:</span>
            <span class="stat-value">${totalDowntimeMins} minutes</span>
          </div>
        </div>
      </div>
    `;

    if (longestInterruption) {
      content += `
        <div class="modal-section">
          <h4>Longest Interruption</h4>
          <p>The most severe interruption lasted ${formatDuration(longestInterruption.duration)}.</p>
          <div class="interruption-details">
            <div><strong>Start:</strong> ${longestInterruption.start.toLocaleString()}</div>
            <div><strong>End:</strong> ${longestInterruption.ongoing ? 'Ongoing at end of data' : longestInterruption.end.toLocaleString()}</div>
          </div>
        </div>
      `;
    }

    content += `
      <div class="modal-section">
        <h4>Impact & Context</h4>
        <p>Power interruptions can have significant impacts:</p>
        <ul>
          <li><strong>Equipment damage:</strong> Sudden power loss can damage sensitive electronics</li>
          <li><strong>Data loss:</strong> Systems without UPS protection may lose unsaved data</li>
          <li><strong>Productivity impact:</strong> Operations dependent on electricity are halted</li>
          <li><strong>Reset/restart requirements:</strong> Equipment may need manual intervention</li>
        </ul>
      </div>
      
    `;

    return content;
  };

  const getInterruptionCountModalContent = () => {
    let content = `
      <div class="modal-section">
        <h4>Number of Interruptions: ${interruptionCount}</h4>
        <p>This metric shows how many times the power supply has been interrupted during the selected time period.</p>
        
        <div class="stats-summary">
          <div class="stat-item">
            <span class="stat-label">Min. duration:</span>
            <span class="stat-value">${formatDuration(minDurationSec)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total downtime:</span>
            <span class="stat-value">${totalDowntimeMins} minutes</span>
          </div>
        </div>
      </div>
    `;
  
    if (interruptions.length > 0) {
      content += `
        <div class="modal-section">
          <h4>Interruption Details</h4>
          <div class="interruption-table-container">
            <table class="interruption-table">
              <thead>
                <tr>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
      `;
  
      // List only the 8 most recent interruptions to save space
      const sortedInterruptions = [...interruptions].sort((a, b) => 
        new Date(b.start) - new Date(a.start)
      );
      
      sortedInterruptions.slice(0, 8).forEach(interruption => {
        // Use shorter date format to save space
        const startTime = interruption.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        const startDate = interruption.start.toLocaleDateString([], {month: 'numeric', day: 'numeric'});
        const endTime = interruption.ongoing ? 'Ongoing' : 
          interruption.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        content += `
          <tr>
            <td>${startDate}, ${startTime}</td>
            <td>${interruption.ongoing ? 'Ongoing' : endTime}</td>
            <td>${formatDuration(interruption.duration)}</td>
          </tr>
        `;
      });
      
      content += `
              </tbody>
            </table>
            ${sortedInterruptions.length > 8 ? `<p class="table-note">Showing 8 most recent of ${sortedInterruptions.length} interruptions</p>` : ''}
          </div>
        </div>
      `;
    }
  
    content += `
      <div class="modal-section">
        <h4>Reliability Implications</h4>
        <p>Frequent interruptions may indicate:</p>
        <ul>
          <li><strong>Grid instability:</strong> Issues with the main power supply</li>
          <li><strong>Local electrical issues:</strong> Problems with internal wiring</li>
          <li><strong>Equipment faults:</strong> Circuit breakers tripping</li>
          <li><strong>Weather impacts:</strong> Environmental factors</li>
        </ul>
        
        <div class="note-box">
          <strong>Industry Standard:</strong> IEEE 1366 establishes metrics like SAIFI that utility companies use. For commercial buildings, more than 3-4 significant interruptions per month typically indicates a problem.
        </div>
      </div>
    `;
  
    return content;
  };

  return (
    <>
      {/* Average Interruption Duration Card */}
      <div className="metric-card large bg-blue">
        <h3>Average Interruption</h3>
        <p className="metric-value">{avgDurationMin} <span className="unit">min</span></p>
        {mostRecentInterruption && (
          <p className="metric-subtext">
            <FontAwesomeIcon icon={faCalendarAlt} /> Last: {mostRecentInterruption.start.toLocaleDateString()}
          </p>
        )}
        <div className="card-icon">
          <FontAwesomeIcon icon={faHourglass} />
        </div>
        <div className="more-info" onClick={() => onModalOpen("Average Interruption Duration", getAverageDurationModalContent())}>
          More info &gt;
        </div>
      </div>

      {/* Number of Interruptions Card */}
      <div className="metric-card large bg-red">
        <h3>Number of Interruptions</h3>
        <p className="metric-value">{interruptionCount}</p>
        {totalDowntimeMins > 0 && (
          <p className="metric-subtext">
            <FontAwesomeIcon icon={faInfoCircle} /> Total downtime: {totalDowntimeMins} min
          </p>
        )}
        <div className="card-icon">
          <FontAwesomeIcon icon={faTimesCircle} />
        </div>
        <div className="more-info" onClick={() => onModalOpen("Interruption Frequency Analysis", getInterruptionCountModalContent())}>
          More info &gt;
        </div>
      </div>
    </>
  );
};

export default InterruptionMetrics;