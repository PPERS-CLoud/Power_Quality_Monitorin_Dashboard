from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ElectricalParameter
from .serializers import ElectricalParameterSerializer
from .services.firebase_service import FirebaseService
from .services.anomaly_service import AnomalyDetectionService

class AnomalyDetectionView(APIView):
    """API endpoint for anomaly detection"""
    
    def post(self, request):
        """Detect anomalies in power readings"""
        readings = request.data.get('readings', [])
        thresholds = request.data.get('thresholds', None)
        
        if not readings:
            return Response(
                {"error": "No readings provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process readings through anomaly detection
        service = AnomalyDetectionService(thresholds)
        processed_readings = service.detect_anomalies(readings)
        
        # Count anomalies
        anomaly_count = sum(1 for r in processed_readings if r.get('is_anomaly', False))
        
        return Response({
            'readings': processed_readings,
            'anomaly_count': anomaly_count,
        })

# Create your views here.

class ElectricalParameterList(generics.ListCreateAPIView):
    queryset = ElectricalParameter.objects.all()
    serializer_class = ElectricalParameterSerializer
    # permission_classes = [IsAuthenticated]

class ElectricalParameterDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = ElectricalParameter.objects.all()
    serializer_class = ElectricalParameterSerializer
    permission_classes = [IsAuthenticated]

# New Firebase-specific views
class FirebaseDataView(APIView):
    """API view for accessing Firebase Realtime Database data."""
    
    def get(self, request):
        """Get all power readings from Firebase."""
        firebase_service = FirebaseService()
        power_readings = firebase_service.get_power_readings()
        
        if power_readings is None:
            return Response(
                {"error": "Failed to fetch data from Firebase"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return Response(power_readings)
        
    def post(self, request):
        """Save power reading to both Django DB and Firebase."""
        serializer = ElectricalParameterSerializer(data=request.data)
        if serializer.is_valid():
            # Save to Django DB
            instance = serializer.save()
            
            # Save to Firebase
            firebase_service = FirebaseService()
            firebase_success = firebase_service.add_power_reading({
                'timestamp': instance.timestamp.isoformat(),
                'voltage': instance.voltage,
                'current': instance.current,
                'power': instance.power,
                'power_factor': instance.power_factor,
                'frequency': instance.frequency,
                'is_anomaly': instance.is_anomaly
            })
            
            response_data = serializer.data
            if not firebase_success:
                response_data['firebase_warning'] = "Data saved to Django DB but failed to save to Firebase"
                
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AnomalyDetectionView(APIView):
    """API endpoint for anomaly detection"""
    
    def post(self, request):
        """Detect anomalies in power readings"""
        readings = request.data.get('readings', [])
        thresholds = request.data.get('thresholds', None)
        
        if not readings:
            return Response(
                {"error": "No readings provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process readings through anomaly detection
        service = AnomalyDetectionService(thresholds)
        processed_readings = service.detect_anomalies(readings)
        
        # Count anomalies
        anomaly_count = sum(1 for r in processed_readings if r.get('is_anomaly', False))
        
        return Response({
            'readings': processed_readings,
            'anomaly_count': anomaly_count,
        })

# Add this new view function
class AvailableNodesView(APIView):
    """API endpoint for retrieving available nodes from Firebase"""
    
    def get(self, request):
        """Get list of available node IDs"""
        try:
            firebase_service = FirebaseService()
            db_ref = firebase_service.db_ref
            
            # Just get the child nodes (keys) without their data
            available_nodes = db_ref.get(shallow=True)
            
            if available_nodes:
                # Filter keys that match the pattern 'C-XX'
                nodes = [
                    node for node in available_nodes.keys() 
                    if isinstance(node, str) and node.startswith('C-')
                ]
                
                # Sort nodes numerically
                nodes.sort(key=lambda x: int(x.split('-')[1]) if x.split('-')[1].isdigit() else float('inf'))
                
                return Response({"nodes": nodes})
            else:
                return Response({"nodes": []})
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch available nodes: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class NodeDateRangeView(APIView):
    """API endpoint for retrieving available date range for a specific node"""
    
    def get(self, request):
        """Get min and max dates for a node"""
        node_id = request.query_params.get('node')
        
        if not node_id:
            return Response(
                {"error": "Node ID parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            firebase_service = FirebaseService()
            db_ref = firebase_service.db_ref
            
            # Reference to the node
            node_ref = db_ref.child(node_id)
            
            # Get all years for this node (shallow to be efficient)
            years = node_ref.get(shallow=True)
            
            if not years:
                return Response({"min_date": None, "max_date": None})
            
            try:
                # Find min and max years - filter only numeric keys
                numeric_years = [int(year) for year in years.keys() if year.isdigit()]
                
                if not numeric_years:
                    return Response({"min_date": None, "max_date": None})
                    
                min_year = min(numeric_years)
                max_year = max(numeric_years)
                
                # For min year, get min month
                min_year_ref = node_ref.child(str(min_year))
                min_year_months = min_year_ref.get(shallow=True) or {}
                
                if not min_year_months:
                    return Response({"min_date": None, "max_date": None})
                
                numeric_months = [int(month) for month in min_year_months.keys() if month.isdigit()]
                if not numeric_months:
                    return Response({"min_date": None, "max_date": None})
                    
                min_month = min(numeric_months)
                
                # For min year and min month, get min day
                min_month_ref = min_year_ref.child(str(min_month).zfill(2))
                min_month_days = min_month_ref.get(shallow=True) or {}
                
                if not min_month_days:
                    return Response({"min_date": None, "max_date": None})
                
                numeric_days = [int(day) for day in min_month_days.keys() if day.isdigit()]
                if not numeric_days:
                    return Response({"min_date": None, "max_date": None})
                    
                min_day = min(numeric_days)
                
                # For max year, get max month
                max_year_ref = node_ref.child(str(max_year))
                max_year_months = max_year_ref.get(shallow=True) or {}
                
                if not max_year_months:
                    return Response({"min_date": None, "max_date": None})
                
                numeric_months = [int(month) for month in max_year_months.keys() if month.isdigit()]
                if not numeric_months:
                    return Response({"min_date": None, "max_date": None})
                    
                max_month = max(numeric_months)
                
                # For max year and max month, get max day
                max_month_ref = max_year_ref.child(str(max_month).zfill(2))
                max_month_days = max_month_ref.get(shallow=True) or {}
                
                if not max_month_days:
                    return Response({"min_date": None, "max_date": None})
                
                numeric_days = [int(day) for day in max_month_days.keys() if day.isdigit()]
                if not numeric_days:
                    return Response({"min_date": None, "max_date": None})
                    
                max_day = max(numeric_days)
                
                # Format dates as YYYY-MM-DD
                min_date = f"{min_year}-{str(min_month).zfill(2)}-{str(min_day).zfill(2)}"
                max_date = f"{max_year}-{str(max_month).zfill(2)}-{str(max_day).zfill(2)}"
                
                return Response({
                    "min_date": min_date,
                    "max_date": max_date
                })
            except (ValueError, KeyError, TypeError) as e:
                # Handle specific errors in processing the data structure
                print(f"Error processing date hierarchy: {e}")
                return Response({"min_date": None, "max_date": None})
                
        except Exception as e:
            print(f"Failed to fetch date range: {str(e)}")
            return Response(
                {"error": f"Failed to fetch date range: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

from datetime import datetime, timedelta
import numpy as np

class TimeSeriesDataView(APIView):
    """API endpoint for efficient time-series data access"""
    
    def get(self, request):
        """Get time-series data with dynamic resolution"""
        node_id = request.query_params.get('node')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        max_points = int(request.query_params.get('max_points', 5000))
        
        if not all([node_id, start_date, end_date]):
            return Response(
                {"error": "Missing parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            firebase_service = FirebaseService()
            db_ref = firebase_service.db_ref
            
            # Convert dates
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            # Add one day to include the end date
            end_dt = end_dt + timedelta(days=1)
            
            # Calculate date range
            date_diff = (end_dt - start_dt).days
            
            # Estimate data points (assuming 86400 points per day)
            estimated_points = date_diff * 86400
            
            # Calculate appropriate sampling rate
            sampling_rate = max(1, estimated_points // max_points)
            
            # For very large ranges, use the PAA (Piecewise Aggregate Approximation) approach
            use_paa = sampling_rate > 60
            
            # Initialize storage for results
            time_series_data = []
            total_points = 0
            
            # Process each day
            current_date = start_dt
            while current_date < end_dt:
                year = current_date.year
                month = str(current_date.month).zfill(2)
                day = str(current_date.day).zfill(2)
                
                # Fetch data for this day
                path = f"{node_id}/{year}/{month}/{day}"
                day_data = db_ref.child(path).get()
                
                if day_data:
                    if use_paa:
                        # Apply PAA: Group data into windows and calculate statistics
                        window_size = 3600  # 1 hour in seconds
                        day_windows = self._apply_paa(day_data, window_size)
                        time_series_data.extend(day_windows)
                        total_points += len(day_windows)
                    else:
                        # Apply simple sampling: take every Nth reading
                        sorted_times = sorted(day_data.keys())
                        sampled_times = sorted_times[::sampling_rate]
                        
                        for time_key in sampled_times:
                            reading = day_data[time_key]
                            time_series_data.append({
                                'timestamp': f"{year}-{month}-{day}T{time_key}",
                                'voltage': float(reading.get('voltage', 0)),
                                'current': float(reading.get('current', 0)),
                                'power': float(reading.get('power', 0)),
                                'power_factor': float(reading.get('powerFactor', 0)),
                                'frequency': float(reading.get('frequency', 0)),
                                'is_anomaly': reading.get('is_anomaly', False)
                            })
                            total_points += 1
                
                current_date += timedelta(days=1)
            
            return Response({
                'time_series': time_series_data,
                'meta': {
                    'original_range_days': date_diff,
                    'sampling_rate': sampling_rate,
                    'points_returned': total_points,
                    'approximation_method': 'PAA' if use_paa else 'uniform_sampling'
                }
            })
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch time-series data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _apply_paa(self, day_data, window_size=3600):
        """Apply Piecewise Aggregate Approximation to reduce data volume"""
        # Group readings by hour (or other window)
        windows = {}
        
        for time_key, reading in day_data.items():
            # Extract hour from timestamp
            hour = time_key.split(':')[0]
            
            if hour not in windows:
                windows[hour] = {
                    'voltage': [],
                    'current': [],
                    'power': [],
                    'power_factor': [],
                    'frequency': [],
                    'anomalies': 0
                }
            
            # Add values to appropriate hour bucket
            windows[hour]['voltage'].append(float(reading.get('voltage', 0)))
            windows[hour]['current'].append(float(reading.get('current', 0)))
            windows[hour]['power'].append(float(reading.get('power', 0)))
            windows[hour]['power_factor'].append(float(reading.get('powerFactor', 0)))
            windows[hour]['frequency'].append(float(reading.get('frequency', 0)))
            
            if reading.get('is_anomaly', False):
                windows[hour]['anomalies'] += 1
        
        # Calculate statistics for each window
        result = []
        for hour, data in windows.items():
            # Calculate min, max, avg, std for each metric
            stats = {}
            for metric in ['voltage', 'current', 'power', 'power_factor', 'frequency']:
                values = data[metric]
                if values:
                    stats[f"{metric}_min"] = min(values)
                    stats[f"{metric}_max"] = max(values)
                    stats[f"{metric}_avg"] = sum(values) / len(values)
                    stats[f"{metric}_std"] = np.std(values) if len(values) > 1 else 0
            
            # Add window metadata
            result.append({
                'window_hour': hour,
                'reading_count': len(data['voltage']),
                'anomaly_count': data['anomalies'],
                'has_anomalies': data['anomalies'] > 0,
                **stats
            })
        
        return result

class AggregatedNodeDataView(APIView):
    """API endpoint for retrieving aggregated node data"""
    
    def get(self, request):
        """Get aggregated data for a node within a date range"""
        node_id = request.query_params.get('node')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        resolution = request.query_params.get('resolution', 'auto')  # 'auto', 'minute', 'hour', 'day'
        
        if not all([node_id, start_date, end_date]):
            return Response(
                {"error": "Missing parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            firebase_service = FirebaseService()
            db_ref = firebase_service.db_ref
            
            # Convert date strings to datetime objects
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            # Calculate date difference
            date_diff = (end_dt - start_dt).days + 1  # Include both start and end days
            
            # Automatically adjust resolution based on date range if set to auto
            if resolution == 'auto':
                if date_diff > 30:
                    resolution = 'day'  # Use daily aggregation for ranges > 30 days
                elif date_diff > 7:
                    resolution = 'hour'  # Use hourly aggregation for ranges > 7 days
                else:
                    resolution = 'minute'  # Use minute resolution for shorter ranges
            
            print(f"Using {resolution} resolution for date range of {date_diff} days")
            
            # Initialize aggregated data array
            aggregated_data = []
            
            # For each day in the date range
            current_date = start_dt
            while current_date <= end_dt:
                year = current_date.year
                month = str(current_date.month).zfill(2)
                day = str(current_date.day).zfill(2)
                
                # Path to this day's data
                path = f"{node_id}/{year}/{month}/{day}"
                day_data = db_ref.child(path).get()
                
                if day_data:
                    # Process data based on resolution
                    if resolution == 'day':
                        # Aggregate to one data point per day
                        values = {
                            'voltage': [],
                            'current': [],
                            'power': [],
                            'powerFactor': [],
                            'frequency': []
                        }
                        
                        anomaly_count = 0
                        
                        # Collect all values for the day
                        for time_key, reading in day_data.items():
                            for param in values.keys():
                                if param in reading:
                                    try:
                                        values[param].append(float(reading[param]))
                                    except (ValueError, TypeError):
                                        # Skip invalid values
                                        pass
                            
                            # Count anomalies
                            if reading.get('is_anomaly', False):
                                anomaly_count += 1
                        
                        # Calculate averages
                        if values['voltage']:  # Check if we have any data
                            aggregated_reading = {
                                'timestamp': f"{year}-{month}-{day}T00:00:00",
                                'voltage': sum(values['voltage']) / len(values['voltage']) if values['voltage'] else 0,
                                'current': sum(values['current']) / len(values['current']) if values['current'] else 0,
                                'power': sum(values['power']) / len(values['power']) if values['power'] else 0,
                                'power_factor': sum(values['powerFactor']) / len(values['powerFactor']) if values['powerFactor'] else 0,
                                'frequency': sum(values['frequency']) / len(values['frequency']) if values['frequency'] else 0,
                                'is_anomaly': anomaly_count > 0,
                                'anomaly_count': anomaly_count,
                                'sample_count': len(next(iter(values.values()), [])),
                                'resolution': 'day'
                            }
                            
                            aggregated_data.append(aggregated_reading)
                        
                    elif resolution == 'hour':
                        # Aggregate by hour
                        hours = {}
                        
                        # Group readings by hour
                        for time_key, reading in day_data.items():
                            hour = time_key.split(':')[0]
                            
                            if hour not in hours:
                                hours[hour] = {
                                    'values': {
                                        'voltage': [],
                                        'current': [],
                                        'power': [],
                                        'powerFactor': [],
                                        'frequency': []
                                    },
                                    'anomaly_count': 0
                                }
                            
                            # Add values to the appropriate hour bucket
                            for param in hours[hour]['values'].keys():
                                if param in reading:
                                    try:
                                        hours[hour]['values'][param].append(float(reading[param]))
                                    except (ValueError, TypeError):
                                        # Skip invalid values
                                        pass
                            
                            # Count anomalies
                            if reading.get('is_anomaly', False):
                                hours[hour]['anomaly_count'] += 1
                        
                        # Calculate hourly averages
                        for hour, data in hours.items():
                            values = data['values']
                            
                            if values['voltage']:  # Check if we have data for this hour
                                aggregated_reading = {
                                    'timestamp': f"{year}-{month}-{day}T{hour}:00:00",
                                    'voltage': sum(values['voltage']) / len(values['voltage']) if values['voltage'] else 0,
                                    'current': sum(values['current']) / len(values['current']) if values['current'] else 0,
                                    'power': sum(values['power']) / len(values['power']) if values['power'] else 0,
                                    'power_factor': sum(values['powerFactor']) / len(values['powerFactor']) if values['powerFactor'] else 0,
                                    'frequency': sum(values['frequency']) / len(values['frequency']) if values['frequency'] else 0,
                                    'is_anomaly': data['anomaly_count'] > 0,
                                    'anomaly_count': data['anomaly_count'],
                                    'sample_count': len(next(iter(values.values()), [])),
                                    'resolution': 'hour'
                                }
                                
                                aggregated_data.append(aggregated_reading)
                    else:
                        # For minute resolution, sample the data but keep individual readings
                        # This helps reduce data volume while maintaining granularity
                        sample_rate = max(1, len(day_data) // 1000)  # Aim for ~1000 points per day max
                        times = sorted(day_data.keys())
                        
                        for i, time_key in enumerate(times):
                            if i % sample_rate == 0:  # Sample at the specified rate
                                reading = day_data[time_key]
                                
                                try:
                                    sample_reading = {
                                        'timestamp': f"{year}-{month}-{day}T{time_key}",
                                        'voltage': float(reading.get('voltage', 0)),
                                        'current': float(reading.get('current', 0)),
                                        'power': float(reading.get('power', 0)),
                                        'power_factor': float(reading.get('powerFactor', 0)),
                                        'frequency': float(reading.get('frequency', 0)),
                                        'is_anomaly': reading.get('is_anomaly', False),
                                        'resolution': 'minute'
                                    }
                                    
                                    aggregated_data.append(sample_reading)
                                except (ValueError, TypeError):
                                    # Skip invalid readings
                                    pass
                
                # Move to next day
                current_date += timedelta(days=1)
            
            # Sort by timestamp
            aggregated_data.sort(key=lambda x: x['timestamp'])
            
            return Response(aggregated_data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch aggregated data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )