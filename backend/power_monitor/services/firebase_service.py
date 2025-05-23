import os
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timedelta
from .cache_service import CacheService

class FirebaseService:
    _instance = None  # Singleton instance

    def __new__(cls):
        """Ensures only one instance of FirebaseService exists."""
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance

    def initialize(self):
        """Initialize Firebase."""
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        FIREBASE_CRED_PATH = os.path.join(BASE_DIR, 'firebase', 'firebase.json')
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(FIREBASE_CRED_PATH)
            firebase_admin.initialize_app(cred, {
                'databaseURL': 'https://powerquality-d9f8e-default-rtdb.asia-southeast1.firebasedatabase.app/'
            })
        
        self.db_ref = db.reference('/')

    def get_power_readings(self):
        """Fetch all power readings from the Realtime Database."""
        try:
            power_data = self.db_ref.child('power_readings').get()
            return power_data
        except Exception as e:
            print(f"Error fetching power readings: {e}")
            return None

    def add_power_reading(self, reading_data):
        """Add a new power reading to the Realtime Database."""
        try:
            self.db_ref.child('power_readings').push(reading_data)
            return True
        except Exception as e:
            print(f"Error adding power reading: {e}")
            return False

    # Enhanced methods from updated branch
    def get_power_readings(self, node=None, limit=50, start_date=None, end_date=None,
                  voltage_min=None, voltage_max=None, current_min=None, current_max=None,
                  power_min=None, power_max=None, power_factor_min=None, power_factor_max=None,
                  frequency_min=None, frequency_max=None, anomaly_only=None, use_cache=True):
        """Fetch power readings from Firebase with extensive filtering."""
        try:
            if node:
                print(f"Fetching readings for node: {node}, limit: {limit}, date range: {start_date} to {end_date}")
                
                # Try multiple days if date range is not specified
                all_readings = []
                processed_readings = []
                
                # Define potential date paths to check
                date_paths = []
                
                # If date range is specified, use those dates
                if start_date and end_date:
                    try:
                        # Parse the dates
                        start = datetime.strptime(start_date, '%Y-%m-%d')
                        end = datetime.strptime(end_date, '%Y-%m-%d')
                        
                        # Generate dates between start and end
                        current_date = start
                        while current_date <= end:
                            date_paths.append({
                                'year': current_date.strftime('%Y'),
                                'month': current_date.strftime('%m'),
                                'day': current_date.strftime('%d')
                            })
                            current_date += timedelta(days=1)
                        
                        print(f"Generated {len(date_paths)} date paths from date range")
                    except Exception as e:
                        print(f"Error parsing date range: {e}")
                        # Fall back to default dates
                        date_paths = [
                            {'year': '2025', 'month': '03', 'day': '10'}
                        ]
                else:
                    # Default: try several date paths if no date range specified
                    date_paths = [
                        {'year': '2025', 'month': '03', 'day': '10'},  # Original hardcoded date
                        {'year': '2025', 'month': '03', 'day': '11'},  # Try one day later
                        {'year': '2025', 'month': '03', 'day': '09'},  # Try one day earlier
                        {'year': '2025', 'month': '03', 'day': '08'},  # Try two days earlier
                    ]
                    
                    # Also try current year dates
                    today = datetime.now()
                    for i in range(5):  # Try today and 4 days before
                        day_to_check = today - timedelta(days=i)
                        date_paths.append({
                            'year': day_to_check.strftime('%Y'),
                            'month': day_to_check.strftime('%m'),
                            'day': day_to_check.strftime('%d')
                        })
                
                # Initialize cache service
                cache = CacheService() if use_cache else None
                
                # Try each date path until we get enough readings or run out of paths
                readings_found = 0
                for date_info in date_paths:
                    if readings_found >= limit:
                        break
                        
                    try:
                        # Construct path for this date
                        path = f"{node}/{date_info['year']}/{date_info['month']}/{date_info['day']}"
                        print(f"Checking Firebase path: {path}")
                        
                        # Check cache first if enabled
                        day_readings = []
                        if use_cache:
                            cached_data = cache.get(
                                node, 
                                date_info['year'], 
                                date_info['month'], 
                                date_info['day']
                            )
                            if cached_data:
                                print(f"Using {len(cached_data)} cached readings for {path}")
                                day_readings = cached_data
                        
                        # If not in cache, fetch from Firebase
                        if not day_readings:
                            # Query Firebase with remaining limit
                            remaining_limit = limit * 2  # Get more than we need for filtering
                            readings_ref = self.db_ref.child(path).order_by_key().limit_to_first(remaining_limit)
                            readings_data = readings_ref.get()
                            
                            if readings_data:
                                print(f"Found {len(readings_data)} raw readings at {path}")
                                
                                # Process data for this date
                                for time, reading in readings_data.items():
                                    try:
                                        # Skip processing if not a dict (common in Firebase)
                                        if not isinstance(reading, dict):
                                            continue
                                            
                                        # Create a processed reading object
                                        processed_reading = {
                                            'id': f"{node}-{date_info['year']}-{date_info['month']}-{date_info['day']}-{time}",
                                            'deviceId': node,
                                            'node': node,
                                            'timestamp': f"{date_info['year']}-{date_info['month']}-{date_info['day']}T{time}",
                                            'voltage': float(reading.get('voltage', 0)),
                                            'current': float(reading.get('current', 0)),
                                            'power': float(reading.get('power', 0)),
                                            'power_factor': float(reading.get('powerFactor', 0)),
                                            'frequency': float(reading.get('frequency', 0)),
                                            'is_anomaly': bool(reading.get('is_anomaly', False)),
                                            'location': reading.get('location', f"BD-{node[2:]}")
                                        }
                                        
                                        # Add to day readings (will be cached)
                                        day_readings.append(processed_reading)
                                            
                                    except Exception as e:
                                        print(f"Error processing reading at {path}/{time}: {e}")
                                
                                # Cache the day's data if caching is enabled
                                if use_cache and day_readings:
                                    cache.set(
                                        node, 
                                        date_info['year'], 
                                        date_info['month'], 
                                        date_info['day'], 
                                        day_readings
                                    )
                            else:
                                print(f"No readings found at path {path}")
                        
                        # Now apply filters to the day's readings and add to results
                        for reading in day_readings:
                            # Apply all the filters here on the backend
                            # Voltage filter
                            if voltage_min and reading['voltage'] < float(voltage_min):
                                continue
                            if voltage_max and reading['voltage'] > float(voltage_max):
                                continue
                            
                            # Current filter
                            if current_min and reading['current'] < float(current_min):
                                continue
                            if current_max and reading['current'] > float(current_max):
                                continue
                            
                            # Power filter
                            if power_min and reading['power'] < float(power_min):
                                continue
                            if power_max and reading['power'] > float(power_max):
                                continue
                            
                            # Power factor filter
                            if power_factor_min and reading['power_factor'] < float(power_factor_min):
                                continue
                            if power_factor_max and reading['power_factor'] > float(power_factor_max):
                                continue
                            
                            # Frequency filter
                            if frequency_min and reading['frequency'] < float(frequency_min):
                                continue
                            if frequency_max and reading['frequency'] > float(frequency_max):
                                continue
                            
                            # Anomaly filter
                            if anomaly_only and not reading['is_anomaly']:
                                continue
                            
                            # If it passed all filters, add to filtered readings
                            processed_readings.append(reading)
                            readings_found += 1
                            
                            # If we've reached our limit after filtering, stop
                            if readings_found >= limit:
                                break
                            
                    except Exception as e:
                        print(f"Error checking path {path}: {e}")
                        
                    # End of day loop
                
                # If we found any filtered readings, return them
                if processed_readings:
                    print(f"Returning {len(processed_readings)} filtered readings for node {node}")
                    return processed_readings
                else:
                    print(f"No readings match filters for node {node}")
                    return []
                    
            else:
                # Handle case without a specific node
                print("No node specified for power readings query")
                return []
                    
        except Exception as e:
            print(f"Error fetching power readings: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_available_nodes(self):
        """Get list of available nodes from Firebase."""
        try:
            print("Attempting to fetch available nodes from Firebase...")
            # First try the simplest approach - get all top-level keys
            root_data = self.db_ref.get()
            
            if not root_data:
                print("No data found in Firebase root reference")
                # Return fallback nodes if no data is found
                fallback_nodes = [
                    'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 
                    'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'
                ]
                print(f"Using fallback nodes: {fallback_nodes}")
                return fallback_nodes
            
            # Filter for keys that look like node IDs (e.g., 'C-1', 'C-2', etc.)
            valid_nodes = [key for key in root_data.keys() if key.startswith('C-')]
            valid_nodes.sort()  # Sort for consistent display
            
            if valid_nodes:
                print(f"Found {len(valid_nodes)} nodes in Firebase: {valid_nodes}")
                return valid_nodes
            else:
                # Return fallback if no valid node patterns found
                fallback_nodes = [
                    'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 
                    'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'
                ]
                print(f"No valid nodes found. Using fallback nodes: {fallback_nodes}")
                return fallback_nodes
                
        except Exception as e:
            print(f"Error fetching available nodes: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Always return fallback nodes on error
            fallback_nodes = [
                'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 
                'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'
            ]
            print(f"Error occurred. Using fallback nodes: {fallback_nodes}")
            return fallback_nodes

    def get_comparison_data(self, nodes, limit=20):
        """Get data for multiple nodes to compare."""
        try:
            if not nodes:
                return []
                
            all_nodes_data = []
            for node in nodes:
                # Use existing get_power_readings with a smaller limit per node
                node_data = self.get_power_readings(
                    node=node,
                    limit=limit
                )
                
                if node_data:
                    all_nodes_data.extend(node_data)
                    
            # Sort all combined data by timestamp, most recent first
            all_nodes_data.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return all_nodes_data
            
        except Exception as e:
            print(f"Error fetching comparison data: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def get_years_for_node(self, node):
        """Get available years for a specific node"""
        try:
            node_ref = self.db_ref.child(node)
            snapshot = node_ref.get(shallow=True)
            
            if snapshot:
                # Filter to include only numeric years
                years = [
                    year for year in snapshot.keys() 
                    if year and year.isdigit()
                ]
                # Sort years in descending order (newest first)
                years.sort(reverse=True)
                return years
            return []
        except Exception as e:
            print(f"Error fetching years for node {node}: {e}")
            return []

    def get_months_for_node_year(self, node, year):
        """Get available months for a specific node and year"""
        try:
            year_ref = self.db_ref.child(f"{node}/{year}")
            snapshot = year_ref.get(shallow=True)
            
            if snapshot:
                # Filter to include only numeric months
                months = [
                    month for month in snapshot.keys() 
                    if month and month.isdigit() and 1 <= int(month) <= 12
                ]
                # Sort months in descending order (newest first)
                months.sort(key=lambda x: int(x), reverse=True)
                return months
            return []
        except Exception as e:
            print(f"Error fetching months for node {node}, year {year}: {e}")
            return []

    def get_days_for_node_year_month(self, node, year, month):
        """Get available days for a specific node, year, and month"""
        try:
            month_ref = self.db_ref.child(f"{node}/{year}/{month}")
            snapshot = month_ref.get(shallow=True)
            
            if snapshot:
                # Filter to include only numeric days
                days = [
                    day for day in snapshot.keys() 
                    if day and day.isdigit() and 1 <= int(day) <= 31
                ]
                # Sort days in descending order (newest first)
                days.sort(key=lambda x: int(x), reverse=True)
                return days
            return []
        except Exception as e:
            print(f"Error fetching days for node {node}, year {year}, month {month}: {e}")
            return []

    def get_day_data(self, node, year, month, day, use_cache=True, since_timestamp=None):
        """Get all data for a specific day, optionally only data newer than since_timestamp"""
        try:
            # If we're fetching fresh data based on timestamp, don't use cache
            if since_timestamp:
                use_cache = False
            
            # Check cache if requested and no timestamp filter
            if use_cache and not since_timestamp:
                cache = CacheService()
                cached_data = cache.get(node, year, month, day)
                if cached_data:
                    print(f"Using cached data for {node}/{year}/{month}/{day}")
                    return cached_data
            
            # Fetch from Firebase
            path = f"{node}/{year}/{month}/{day}"
            day_ref = self.db_ref.child(path)
            
            # If since_timestamp is provided, we'll filter after fetching
            snapshot = day_ref.get()
            
            if snapshot:
                # Convert Firebase data to readings format
                readings = []
                for time, reading in snapshot.items():
                    try:
                        if not isinstance(reading, dict):
                            continue
                        
                        # Create ISO timestamp for this reading
                        timestamp = f"{year}-{month}-{day}T{time}"
                        
                        # If since_timestamp is provided, skip readings that are older
                        if since_timestamp and timestamp <= since_timestamp:
                            continue
                        
                        processed_reading = {
                            'id': f"{node}-{year}-{month}-{day}-{time}",
                            'deviceId': node,
                            'node': node,
                            'timestamp': timestamp,
                            'voltage': float(reading.get('voltage', 0)),
                            'current': float(reading.get('current', 0)),
                            'power': float(reading.get('power', 0)),
                            'power_factor': float(reading.get('powerFactor', 0)),
                            'frequency': float(reading.get('frequency', 0)),
                            'is_anomaly': bool(reading.get('is_anomaly', False)),
                            'location': reading.get('location', f"BD-{node[2:]}")
                        }
                        
                        readings.append(processed_reading)
                    except Exception as e:
                        print(f"Error processing reading at {path}/{time}: {e}")
                
                # Sort readings by timestamp (newest first)
                readings.sort(key=lambda x: x['timestamp'], reverse=True)
                
                # Store in cache if enabled and we're not filtering by timestamp
                if use_cache and not since_timestamp and readings:
                    cache = CacheService()
                    cache.set(node, year, month, day, readings)
                
                return readings
            return []
        except Exception as e:
            print(f"Error fetching day data for {node}/{year}/{month}/{day}: {e}")
            return []

    def get_month_data(self, node, year, month, use_cache=True, since_timestamp=None):
        """Get all data for a specific month by fetching all days"""
        try:
            # Create a month cache key
            cache_key = f"{node}_{year}_{month}_all"
            
            # If fetching only new data by timestamp, don't use cache
            if since_timestamp:
                use_cache = False
                
            # Check if entire month is cached
            if use_cache:
                cache = CacheService()
                cached_month_data = cache.get(node, year, month, "all")
                if cached_month_data:
                    print(f"Using cached data for entire month {node}/{year}/{month}")
                    return cached_month_data
                    
            # Get available days first
            days = self.get_days_for_node_year_month(node, year, month)
            
            if not days:
                return []
            
            # Fetch data for each day
            all_readings = []
            for day in days:
                day_readings = self.get_day_data(
                    node, year, month, day, 
                    use_cache=use_cache,
                    since_timestamp=since_timestamp
                )
                all_readings.extend(day_readings)
            
            # Sort by timestamp (newest first)
            all_readings.sort(key=lambda x: x['timestamp'], reverse=True)
            
            # Cache the entire month's data if we're not just getting new data
            if use_cache and not since_timestamp and all_readings:
                cache = CacheService()
                cache.set(node, year, month, "all", all_readings)
            
            return all_readings
        except Exception as e:
            print(f"Error fetching month data for {node}/{year}/{month}: {e}")
            return []