class AnomalyDetectionService:
    """Service for detecting anomalies in power readings based on thresholds."""
    
    def __init__(self, thresholds=None):
        """Initialize with configurable thresholds."""
        self.thresholds = thresholds or {
            'voltage': {'min': 210, 'max': 230},
            'current': {'min': 0, 'max': 30},
            'power': {'min': 0, 'max': 5000},
            'frequency': {'min': 59.5, 'max': 60.5},
            'power_factor': {'min': 0.85, 'max': 1.0}
        }
    
    def detect_anomalies(self, readings):
        """Process a list of readings and flag anomalies based on thresholds.
        
        Args:
            readings: List of dictionaries containing power readings
            
        Returns:
            The same list with is_anomaly flags added to each reading
        """
        if not readings:
            return []
            
        processed_readings = []
        
        for reading in readings:
            # Clone the reading to avoid modifying the original
            processed = dict(reading)
            
            # Check each parameter against thresholds
            is_anomaly = False
            anomaly_parameters = []
            
            # Voltage check
            if ('voltage' in processed and 
                (processed['voltage'] < self.thresholds['voltage']['min'] or 
                 processed['voltage'] > self.thresholds['voltage']['max'])):
                is_anomaly = True
                anomaly_parameters.append('voltage')
            
            # Current check
            if ('current' in processed and 
                (processed['current'] < self.thresholds['current']['min'] or 
                 processed['current'] > self.thresholds['current']['max'])):
                is_anomaly = True
                anomaly_parameters.append('current')
            
            # Power check
            if ('power' in processed and 
                (processed['power'] < self.thresholds['power']['min'] or 
                 processed['power'] > self.thresholds['power']['max'])):
                is_anomaly = True
                anomaly_parameters.append('power')
            
            # Frequency check
            if ('frequency' in processed and 
                (processed['frequency'] < self.thresholds['frequency']['min'] or 
                 processed['frequency'] > self.thresholds['frequency']['max'])):
                is_anomaly = True
                anomaly_parameters.append('frequency')
            
            # Power factor check
            if ('power_factor' in processed and 
                (processed['power_factor'] < self.thresholds['power_factor']['min'] or 
                 processed['power_factor'] > self.thresholds['power_factor']['max'])):
                is_anomaly = True
                anomaly_parameters.append('power_factor')
            
            # Add anomaly info to the reading
            processed['is_anomaly'] = is_anomaly
            processed['anomaly_parameters'] = anomaly_parameters if is_anomaly else []
            
            processed_readings.append(processed)
        
        return processed_readings