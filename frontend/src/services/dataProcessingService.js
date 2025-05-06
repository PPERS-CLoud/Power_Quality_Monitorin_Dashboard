/**
 * Utility functions for processing power data
 */

// Process anomalies on the frontend
export const processAnomalies = (readings) => {
    if (!readings || readings.length === 0) return [];
    
    // Define thresholds (same as backend)
    const thresholds = {
      'voltage': { 'min': 217.4, 'max': 242.6 },
      'current': { 'min': 0, 'max': 50 },
      'power': { 'min': 0, 'max': 10000 },
      'frequency': { 'min': 59.2, 'max': 60.8 },
      'power_factor': { 'min': 0.792, 'max': 1.0 }
    };
    
    // Process each reading
    return readings.map(reading => {
      // Clone the reading
      const processed = { ...reading };
      
      const anomalyParameters = [];
      let is_anomaly = false;
      
      // Check each parameter against thresholds
      if ('voltage' in processed && (processed.voltage < thresholds.voltage.min || 
                                    processed.voltage > thresholds.voltage.max)) {
        anomalyParameters.push('voltage');
        is_anomaly = true;
      }
      
      if ('current' in processed && (processed.current < thresholds.current.min || 
                                    processed.current > thresholds.current.max)) {
        anomalyParameters.push('current');
        is_anomaly = true;
      }
      
      if ('power' in processed && (processed.power < thresholds.power.min || 
                                  processed.power > thresholds.power.max)) {
        anomalyParameters.push('power');
        is_anomaly = true;
      }
      
      if ('frequency' in processed && (processed.frequency < thresholds.frequency.min || 
                                      processed.frequency > thresholds.frequency.max)) {
        anomalyParameters.push('frequency');
        is_anomaly = true;
      }
      
      if ('power_factor' in processed && (processed.power_factor < thresholds.power_factor.min || 
                                         processed.power_factor > thresholds.power_factor.max)) {
        anomalyParameters.push('power_factor');
        is_anomaly = true;
      }
      
      // Update reading with anomaly information
      processed.is_anomaly = is_anomaly;
      processed.anomaly_parameters = anomalyParameters;
      
      return processed;
    });
  };
  
  // Sample data for display if there's too much data
  export const sampleDataForDisplay = (data, dayCount) => {
    if (!data || data.length === 0) return [];
    
    // Keep all anomalies
    const anomalies = data.filter(r => r.is_anomaly);
    // Get regular readings
    const normalReadings = data.filter(r => !r.is_anomaly);
    
    let samplingRate = 1;
    
    // Determine sampling rate based on number of days and data points
    if (dayCount > 30) {
      samplingRate = 20; // Aggressive sampling for long periods
    } else if (dayCount > 14) {
      samplingRate = 10; // Moderate sampling for 2+ weeks
    } else if (dayCount > 7) {
      samplingRate = 5; // Light sampling for 1-2 weeks
    } else if (normalReadings.length > 5000) {
      samplingRate = 3; // Very light sampling if many points
    }
    
    // Sample regular readings
    const sampledNormal = samplingRate === 1 
      ? normalReadings 
      : normalReadings.filter((_, index) => index % samplingRate === 0);
    
    // Combine and sort
    const combined = [...anomalies, ...sampledNormal];
    return combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };
  
  // Helper to format date for display
  export const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Helper to format date as YYYY-MM-DD
  export const formatDateString = (date) => {
    if (!date) return '';
    
    if (typeof date === 'string') {
      // If already a string in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Otherwise, convert to Date first
      date = new Date(date);
    }
    
    if (isNaN(date.getTime())) {
      console.error("Invalid date object in formatDateString");
      return '';
    }
    
    return date.toISOString().split('T')[0];
  };
  
  // Calculate date range warning
  export const getDateRangeWarning = (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateDiff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      if (dateDiff > 30) {
        return "Long date range detected. Data will be sampled for better performance.";
      } else if (dateDiff > 7) {
        return "Wide date range detected. Some data points may be sampled for performance.";
      }
      return null;
    } catch (e) {
      return null;
    }
  };