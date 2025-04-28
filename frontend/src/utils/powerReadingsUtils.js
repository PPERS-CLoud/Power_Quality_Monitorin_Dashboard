/**
 * Utility functions for the PowerReadings component
 */

/**
 * Determines if a reading is anomalous based on parameter thresholds
 * @param {Object} reading - The power reading to check
 * @returns {boolean} True if the reading is anomalous
 */
export const isAnomalyByThresholds = (reading) => {
    if (!(217.4 <= reading.voltage && reading.voltage <= 242.6)) {
        return true;
    }
    if (!(59.2 <= reading.frequency && reading.frequency <= 60.8)) {
        return true;
    }
    if (!(0.792 <= reading.power_factor && reading.power_factor <= 1)) {
        return true;
    }
    return false;
};

/**
 * Get reason for anomaly
 * @param {Object} reading - The power reading to check
 * @returns {string} Reason for the anomaly, or empty string if not anomalous
 */
export const getAnomalyReason = (reading) => {
    if (!(217.4 <= reading.voltage && reading.voltage <= 242.6)) {
        return "Voltage out of range";
    }
    if (!(59.2 <= reading.frequency && reading.frequency <= 60.8)) {
        return "Frequency out of range";
    }
    if (!(0.792 <= reading.power_factor && reading.power_factor <= 1)) {
        return "Power Factor out of range";
    }
    if (reading.is_anomaly) {
        return "Other anomaly detected";
    }
    return "";
};

/**
 * Format date for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted date
 */
export const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
};

/**
 * Format time for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted time
 */
export const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
};

/**
 * Get month name from month number
 * @param {string|number} month - Month number (1-12)
 * @returns {string} Month name
 */
export const getMonthName = (month) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1];
};

/**
 * Format date for Firebase path
 * @param {Date} date - Date object
 * @returns {Object} Formatted date parts and string
 */
export const formatDateForPath = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return { year, month, day, formatted: `${year}-${month}-${day}` };
};