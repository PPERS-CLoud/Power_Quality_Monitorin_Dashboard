import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { isAnomalyByThresholds, getAnomalyReason } from '../utils/powerReadingsUtils';

/**
 * Component to display a single power reading row
 */
const ReadingRow = React.memo(({ reading, formatDate, formatTime }) => {
    // Check if anomalous by thresholds or by the server-side flag
    const isAnomaly = reading.is_anomaly || isAnomalyByThresholds(reading);
    
    // Get reason for the anomaly
    const anomalyReason = isAnomaly ? getAnomalyReason(reading) : "";
    
    return (
        <tr 
            className={`${isAnomaly ? 'anomaly-row' : ''} ${reading.isNew ? 'new-reading' : ''}`}
            title={anomalyReason ? `Anomaly: ${anomalyReason}` : ""}
        >
            <td>{reading.deviceId}</td>
            <td>{formatDate(reading.timestamp)}</td>
            <td>{formatTime(reading.timestamp)}</td>
            <td className={!(217.4 <= reading.voltage && reading.voltage <= 242.6) ? 'anomaly-value' : ''}>
                {reading.voltage}
            </td>
            <td>{reading.current}</td>
            <td>{reading.power}</td>
            <td className={!(59.2 <= reading.frequency && reading.frequency <= 60.8) ? 'anomaly-value' : ''}>
                {reading.frequency}
            </td>
            <td className={!(0.792 <= reading.power_factor && reading.power_factor <= 1) ? 'anomaly-value' : ''}>
                {reading.power_factor}
            </td>
            <td className={isAnomaly ? 'anomaly-cell' : 'normal-cell'}>
                {isAnomaly ? (
                    <span className="anomaly-indicator" title={anomalyReason}>
                        <FontAwesomeIcon icon={faExclamationTriangle} /> Yes
                    </span>
                ) : (
                    <span className="normal-indicator">
                        <FontAwesomeIcon icon={faCheck} /> No
                    </span>
                )}
            </td>
        </tr>
    );
});

export default ReadingRow;