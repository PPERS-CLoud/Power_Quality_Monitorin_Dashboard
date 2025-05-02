from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from .services.firebase_service import FirebaseService
from .services.anomaly_service import AnomalyDetectionService
from .services.cache_service import CacheService
from datetime import datetime, timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import UserRegistrationSerializer, UserLoginSerializer
from django.contrib.auth.hashers import make_password
from .mongo_utils import save_user, find_user_by_email, authenticate_user
import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .services.cache_service import CacheService
from datetime import datetime
from .models import User

# Add these imports at the top if not already present
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.cache_service import CacheService

# Add these new view classes at the end of the file:

class CacheStatsView(APIView):
    """View for retrieving cache statistics"""
    
    def get(self, request):
        """Get cache statistics"""
        try:
            cache = CacheService()
            stats = cache.get_cache_stats()
            return Response(stats)
        except Exception as e:
            return Response(
                {"error": f"Failed to get cache stats: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ClearCacheView(APIView):
    """View for clearing cache"""
    
    def post(self, request):
        """Clear cache for a specific node or all cache"""
        try:
            node = request.data.get('node', None)
            cache = CacheService()
            cache.clear(node)
            return Response({"success": True, "message": f"Cache cleared for {'node '+node if node else 'all nodes'}"})
        except Exception as e:
            return Response(
                {"error": f"Failed to clear cache: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CachedNodesView(APIView):
    """View for retrieving nodes with cached data"""
    
    def get(self, request):
        """Get list of nodes with cached data"""
        try:
            cache = CacheService()
            cached_nodes = cache.get_cached_nodes()
            return Response(cached_nodes)
        except Exception as e:
            return Response(
                {"error": f"Failed to get cached nodes: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

# Option 1: Use ViewSet with @action decorators
class FirebaseViewSet(ViewSet):
    """ViewSet for handling Firebase data operations."""
    
    def list(self, request):
        """Get power readings from Firebase with optional filters."""
        firebase_service = FirebaseService()
        
        # Extract query parameters
        node = request.query_params.get('node', None)
        limit = int(request.query_params.get('limit', 50))
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        # Get data from Firebase with filters
        power_readings = firebase_service.get_power_readings(node, limit, start_date, end_date)
        
        if power_readings is None:
            return Response(
                {"error": "Failed to fetch data from Firebase"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return Response(power_readings)

    @action(detail=False, methods=['get'], url_path='nodes')
    def get_nodes(self, request):
        """Get list of available nodes from Firebase."""
        firebase_service = FirebaseService()
        nodes = firebase_service.get_available_nodes()
        
        if nodes is None:
            return Response(
                {"error": "Failed to fetch nodes from Firebase"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return Response(nodes)

    @action(detail=False, methods=['get'], url_path='compare')
    def compare_nodes(self, request):
        """Get data for multiple nodes to compare."""
        firebase_service = FirebaseService()
        
        # Extract query parameters
        nodes_param = request.query_params.get('nodes', '')
        nodes = nodes_param.split(',') if nodes_param else []
        limit = int(request.query_params.get('limit', 20))
        
        if not nodes:
            return Response(
                {"error": "No nodes specified for comparison"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get comparison data from Firebase
        comparison_data = firebase_service.get_comparison_data(nodes, limit)
        
        if comparison_data is None:
            return Response(
                {"error": "Failed to fetch comparison data from Firebase"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return Response(comparison_data)

# Option 2: Use separate APIView classes without @action decorators
class FirebaseDataView(APIView):
    """View for handling Firebase data operations."""
    
    def get(self, request):
        """Get power readings from Firebase with extensive filtering."""
        try:
            firebase_service = FirebaseService()
            
            # Extract all query parameters
            node = request.query_params.get('node')
            limit = int(request.query_params.get('limit', 50))
            
            # Date parameters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Range parameters - voltage
            voltage_min = request.query_params.get('voltage_min')
            voltage_max = request.query_params.get('voltage_max')
            
            # Range parameters - current
            current_min = request.query_params.get('current_min')
            current_max = request.query_params.get('current_max')
            
            # Range parameters - power
            power_min = request.query_params.get('power_min')
            power_max = request.query_params.get('power_max')
            
            # Range parameters - power factor
            power_factor_min = request.query_params.get('power_factor_min')
            power_factor_max = request.query_params.get('power_factor_max')
            
            # Range parameters - frequency
            frequency_min = request.query_params.get('frequency_min')
            frequency_max = request.query_params.get('frequency_max')
            
            # Boolean parameters
            anomaly_only = request.query_params.get('anomaly_only') == 'true'
            
            print(f"API request for node {node} with filters - date: {start_date} to {end_date}, voltage: {voltage_min}-{voltage_max}, current: {current_min}-{current_max}, power: {power_min}-{power_max}, pf: {power_factor_min}-{power_factor_max}, freq: {frequency_min}-{frequency_max}, anomaly_only: {anomaly_only}")
            
            # Get data from Firebase with filters
            power_readings = firebase_service.get_power_readings(
                node=node, 
                limit=limit, 
                start_date=start_date, 
                end_date=end_date,
                voltage_min=voltage_min,
                voltage_max=voltage_max,
                current_min=current_min,
                current_max=current_max,
                power_min=power_min,
                power_max=power_max,
                power_factor_min=power_factor_min,
                power_factor_max=power_factor_max,
                frequency_min=frequency_min,
                frequency_max=frequency_max,
                anomaly_only=anomaly_only
            )
            
            if power_readings is None:
                return Response(
                    {"error": "Failed to fetch data from Firebase"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            print(f"API response: {len(power_readings)} readings")
            return Response(power_readings)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Server error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FirebaseNodesView(APIView):
    """View for getting available nodes from Firebase."""
    
    def get(self, request):
        """Get list of available nodes from Firebase."""
        try:
            firebase_service = FirebaseService()
            nodes = firebase_service.get_available_nodes()
            
            # Always return a valid response, even if nodes is None
            if nodes is None:
                nodes = [
                    'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 
                    'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'
                ]
            
            return Response(nodes)
        except Exception as e:
            # Log the error but return fallback data
            print(f"Error in FirebaseNodesView.get: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return fallback nodes on any error
            fallback_nodes = [
                'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 
                'C-11', 'C-13', 'C-14', 'C-15', 'C-16', 'C-17', 'C-18', 'C-19', 'C-20'
            ]
            return Response(fallback_nodes)

class FirebaseCompareView(APIView):
    """View for comparing data from multiple nodes."""
    
    def get(self, request):
        """Get data for multiple nodes to compare."""
        firebase_service = FirebaseService()
        
        # Extract query parameters
        nodes_param = request.query_params.get('nodes', '')
        nodes = nodes_param.split(',') if nodes_param else []
        limit = int(request.query_params.get('limit', 20))
        
        if not nodes:
            return Response(
                {"error": "No nodes specified for comparison"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get comparison data from Firebase
        comparison_data = firebase_service.get_comparison_data(nodes, limit)
        
        if comparison_data is None:
            return Response(
                {"error": "Failed to fetch comparison data from Firebase"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        return Response(comparison_data)

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

class YearsForNodeView(APIView):
    """View for fetching available years for a specific node"""
    
    def get(self, request):
        try:
            node = request.query_params.get('node')
            if not node:
                return Response(
                    {"error": "Node parameter is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            firebase_service = FirebaseService()
            years = firebase_service.get_years_for_node(node)
            
            return Response(years)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch years: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MonthsForNodeYearView(APIView):
    """View for fetching available months for a specific node and year"""
    
    def get(self, request):
        try:
            node = request.query_params.get('node')
            year = request.query_params.get('year')
            
            if not node or not year:
                return Response(
                    {"error": "Node and year parameters are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            firebase_service = FirebaseService()
            months = firebase_service.get_months_for_node_year(node, year)
            
            return Response(months)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch months: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DaysForNodeYearMonthView(APIView):
    """View for fetching available days for a specific node, year, and month"""
    
    def get(self, request):
        try:
            node = request.query_params.get('node')
            year = request.query_params.get('year')
            month = request.query_params.get('month')
            
            if not node or not year or not month:
                return Response(
                    {"error": "Node, year, and month parameters are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            firebase_service = FirebaseService()
            days = firebase_service.get_days_for_node_year_month(node, year, month)
            
            return Response(days)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch days: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class NodeDataView(APIView):
    """View for fetching data for a specific node, year, month, and day"""
    
    def get(self, request):
        try:
            node = request.query_params.get('node')
            year = request.query_params.get('year')
            month = request.query_params.get('month')
            day = request.query_params.get('day')
            use_cache = request.query_params.get('use_cache', 'true').lower() == 'true'
            since_timestamp = request.query_params.get('since_timestamp')  # New parameter
            
            if not node or not year or not month:
                return Response(
                    {"error": "Node, year, and month parameters are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            firebase_service = FirebaseService()
            
            # If day is provided, fetch data for that day
            # Otherwise, fetch data for the entire month
            if day:
                data = firebase_service.get_day_data(
                    node, year, month, day, 
                    use_cache=use_cache,
                    since_timestamp=since_timestamp
                )
            else:
                data = firebase_service.get_month_data(
                    node, year, month,
                    use_cache=use_cache,
                    since_timestamp=since_timestamp
                )
            
            return Response(data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DashboardDataView(APIView):
    """View for fetching processed dashboard data"""
    
    def get(self, request):
        """Process and return all dashboard data in one request"""
        try:
            # Get required parameters
            node = request.query_params.get('node')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            graph_type = request.query_params.get('graph_type', 'power')
            
            if not node or not start_date or not end_date:
                return Response(
                    {"error": "Node, start_date, and end_date parameters are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse dates
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                # Include the full end date by setting it to 23:59:59
                end_date_obj = end_date_obj.replace(hour=23, minute=59, second=59)
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate date range
            date_range = []
            current_date = start_date_obj
            while current_date <= end_date_obj:
                date_range.append(current_date)
                current_date += timedelta(days=1)
            
            # Initialize Firebase service
            firebase_service = FirebaseService()
            
            # Determine appropriate sampling mode based on date range size
            days_diff = (end_date_obj - start_date_obj).days + 1
            
            # Estimate total number of data points (assuming ~1 reading per 30 seconds)
            estimated_total = days_diff * 86400 // 30  # ~2880 points per day
            
            # Calculate target number of points based on range size
            target_count = 0
            resolution = ''
            
            if days_diff > 30:  # More than a month
                target_count = 10000
                resolution = 'day'
            elif days_diff > 7:  # More than a week
                target_count = 20000
                resolution = 'hour'
            elif days_diff > 2:  # More than 2 days
                target_count = 30000
                resolution = 'minute'
            else:
                target_count = 50000  # For 1-2 days, keep more detail
                resolution = 'raw'
            
            # Calculate appropriate sampling rate to reach target count
            sampling_rate = max(1, (estimated_total // target_count) + 1)
            
            print(f"Processing {days_diff} days of data. Estimated points: {estimated_total}, " +
                  f"Target: {target_count}, Sampling rate: {sampling_rate}, Resolution: {resolution}")
            
            # Fetch data with progress tracking
            all_readings = []
            
            # Fetch all days in the range
            for date in date_range:
                year = str(date.year)
                month = str(date.month).zfill(2)
                day = str(date.day).zfill(2)
                
                # Use the get_day_data method from FirebaseService
                day_readings = firebase_service.get_day_data(node, year, month, day, use_cache=True)
                all_readings.extend(day_readings)
            
            print(f"Total readings fetched: {len(all_readings)}")
            
            # Apply anomaly detection
            processed_readings = self.process_anomalies(all_readings)
            print(f"Anomaly detection completed")
            
            # Apply sampling if needed
            if sampling_rate > 1:
                processed_readings = self.sample_data(processed_readings, sampling_rate)
                print(f"Sampling applied at rate 1:{sampling_rate}, readings count: {len(processed_readings)}")
            
            # Calculate statistics for all parameters
            statistics = self.calculate_statistics(processed_readings)
            
            # Detect interruptions
            interruptions = self.detect_interruptions(processed_readings)
            
            # Generate anomaly summary
            anomaly_summary = self.generate_anomaly_summary(processed_readings)
            
            # Prepare graph data for all parameters
            graph_data = self.prepare_graph_data(processed_readings)
            
            # Get the latest reading for PowerQualityStatus component
            latest_reading = None
            if processed_readings:
                latest_readings = sorted(processed_readings, 
                                       key=lambda x: x['timestamp'] if 'timestamp' in x else '',
                                       reverse=True)
                latest_reading = latest_readings[0] if latest_readings else None
            
            response_data = {
                "readings": processed_readings,
                "resolution": resolution,
                "total_readings": len(all_readings),
                "displayed_readings": len(processed_readings),
                "sampling_rate": sampling_rate,
                "statistics": statistics,
                "interruptions": interruptions,
                "anomaly_summary": anomaly_summary,
                "graph_data": graph_data,
                "latest_reading": latest_reading
            }
            
            return Response(response_data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch dashboard data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def process_anomalies(self, readings):
        """Apply anomaly detection to readings"""
        if not readings:
            return []
        
        # Define thresholds
        thresholds = {
            'voltage': {'min': 217.4, 'max': 242.6},
            'current': {'min': 0, 'max': 50},
            'power': {'min': 0, 'max': 10000},
            'frequency': {'min': 59.2, 'max': 60.8},
            'power_factor': {'min': 0.792, 'max': 1.0}
        }
        
        # Process each reading
        processed_readings = []
        for reading in readings:
            # Clone the reading
            processed = dict(reading)
            
            anomaly_parameters = []
            is_anomaly = False
            
            # Check each parameter against thresholds
            if 'voltage' in processed and (processed['voltage'] < thresholds['voltage']['min'] or 
                                          processed['voltage'] > thresholds['voltage']['max']):
                anomaly_parameters.append('voltage')
                is_anomaly = True
                
            if 'current' in processed and (processed['current'] < thresholds['current']['min'] or 
                                          processed['current'] > thresholds['current']['max']):
                anomaly_parameters.append('current')
                is_anomaly = True
                
            if 'power' in processed and (processed['power'] < thresholds['power']['min'] or 
                                        processed['power'] > thresholds['power']['max']):
                anomaly_parameters.append('power')
                is_anomaly = True
                
            if 'frequency' in processed and (processed['frequency'] < thresholds['frequency']['min'] or 
                                            processed['frequency'] > thresholds['frequency']['max']):
                anomaly_parameters.append('frequency')
                is_anomaly = True
                
            if 'power_factor' in processed and (processed['power_factor'] < thresholds['power_factor']['min'] or 
                                               processed['power_factor'] > thresholds['power_factor']['max']):
                anomaly_parameters.append('power_factor')
                is_anomaly = True
            
            # Update reading with anomaly information
            processed['is_anomaly'] = is_anomaly
            processed['anomaly_parameters'] = anomaly_parameters
            
            processed_readings.append(processed)
            
        return processed_readings
    
    def sample_data(self, data, sampling_rate):
        """Sample data while preserving anomalies"""
        if not data or sampling_rate <= 1:
            return data
        
        # Keep all anomalies
        anomalies = [r for r in data if r.get('is_anomaly', False)]
        # Get regular readings
        regular_readings = [r for r in data if not r.get('is_anomaly', False)]
        
        print(f"Sampling {len(regular_readings)} regular readings at rate 1:{sampling_rate}")
        print(f"Preserving {len(anomalies)} anomalies")
        
        # Sample regular readings
        sampled_regular = [regular_readings[i] for i in range(0, len(regular_readings), sampling_rate)]
        
        # Combine and sort by timestamp
        combined = anomalies + sampled_regular
        combined.sort(key=lambda x: x['timestamp'])
        
        return combined
    
    def calculate_statistics(self, readings):
        """Calculate statistics for each parameter"""
        if not readings:
            return {}
        
        # Parameters to analyze
        parameters = ['voltage', 'current', 'power', 'frequency', 'power_factor']
        
        # Initialize statistics
        stats = {}
        
        for param in parameters:
            # Get values for this parameter
            values = [reading[param] for reading in readings if param in reading]
            
            if values:
                param_stats = {
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                    'count': len(values)
                }
                
                # Round values for readability
                for key in ['min', 'max', 'avg']:
                    param_stats[key] = round(param_stats[key], 2)
                
                # Add to overall stats
                stats[param] = param_stats
        
        return stats
    
    def detect_interruptions(self, readings, voltage_threshold=180, min_duration_sec=30):
        """Detect power interruptions in readings"""
        if not readings:
            return {'count': 0, 'avg_duration_min': 0, 'details': []}
        
        # Sort readings by timestamp
        sorted_readings = sorted(readings, key=lambda x: x['timestamp'])
        
        interruptions = []
        in_interruption = False
        interruption_start = None
        min_voltage = None
        
        # Process each reading to find interruptions
        for i, reading in enumerate(sorted_readings):
            # Check if voltage below threshold
            if reading['voltage'] < voltage_threshold:
                # Start of interruption
                if not in_interruption:
                    in_interruption = True
                    interruption_start = reading['timestamp']
                    min_voltage = reading['voltage']
                else:
                    # Update minimum voltage during interruption
                    min_voltage = min(min_voltage, reading['voltage'])
            else:
                # End of interruption
                if in_interruption:
                    in_interruption = False
                    interruption_end = reading['timestamp']
                    
                    # Calculate duration
                    start_time = datetime.fromisoformat(interruption_start.replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(interruption_end.replace('Z', '+00:00'))
                    duration_sec = (end_time - start_time).total_seconds()
                    
                    # Only record if duration exceeds minimum threshold
                    if duration_sec >= min_duration_sec:
                        # Determine severity
                        severity = 'critical' if min_voltage < 100 else 'major' if min_voltage < 150 else 'minor'
                        
                        interruptions.append({
                            'start': interruption_start,
                            'end': interruption_end,
                            'duration_sec': duration_sec,
                            'duration_readable': self.format_duration(duration_sec),
                            'min_voltage': round(min_voltage, 1),
                            'severity': severity,
                            'ongoing': False
                        })
        
        # Handle case where we're still in an interruption at the end of the data
        if in_interruption and interruption_start:
            # Use last reading as end point
            interruption_end = sorted_readings[-1]['timestamp']
            
            # Calculate duration
            start_time = datetime.fromisoformat(interruption_start.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(interruption_end.replace('Z', '+00:00'))
            duration_sec = (end_time - start_time).total_seconds()
            
            if duration_sec >= min_duration_sec:
                # Determine severity
                severity = 'critical' if min_voltage < 100 else 'major' if min_voltage < 150 else 'minor'
                
                interruptions.append({
                    'start': interruption_start,
                    'end': interruption_end,
                    'duration_sec': duration_sec,
                    'duration_readable': self.format_duration(duration_sec),
                    'min_voltage': round(min_voltage, 1),
                    'severity': severity,
                    'ongoing': True
                })
        
        # Calculate summary metrics
        count = len(interruptions)
        total_duration_sec = sum(i['duration_sec'] for i in interruptions)
        avg_duration_min = round(total_duration_sec / count / 60, 1) if count > 0 else 0
        
        return {
            'count': count,
            'total_duration_sec': total_duration_sec,
            'avg_duration_min': avg_duration_min,
            'details': interruptions
        }
    
    def generate_anomaly_summary(self, readings):
        """Generate summary of anomalies"""
        if not readings:
            return {
                'count': 0,
                'percentage': 0,
                'severity_level': 'none',
                'parameter_counts': {
                    'voltage': 0,
                    'current': 0,
                    'power': 0,
                    'frequency': 0,
                    'power_factor': 0
                },
                'total_readings': 0
            }
        
        # Count anomalies
        anomalies = [r for r in readings if r.get('is_anomaly', False)]
        anomaly_count = len(anomalies)
        
        # Create summary of anomaly parameters
        parameter_counts = {
            'voltage': 0,
            'current': 0,
            'power': 0,
            'frequency': 0,
            'power_factor': 0
        }
        
        # Count parameter-specific anomalies
        for anomaly in anomalies:
            params = anomaly.get('anomaly_parameters', [])
            for param in params:
                if param in parameter_counts:
                    parameter_counts[param] += 1
        
        # Calculate percentage of anomalies
        total_readings = len(readings)
        percentage = (anomaly_count / total_readings * 100) if total_readings > 0 else 0
        
        # Determine severity level
        if percentage == 0:
            severity = 'none'
        elif percentage < 5:
            severity = 'low'
        elif percentage < 15:
            severity = 'medium'
        else:
            severity = 'high'
        
        return {
            'count': anomaly_count,
            'percentage': round(percentage, 2),
            'parameter_counts': parameter_counts,
            'severity_level': severity,
            'total_readings': total_readings
        }
    
    def prepare_graph_data(self, readings):
        """Prepare data for different graph types"""
        if not readings:
            return {}
            
        # Sort readings by timestamp
        sorted_readings = sorted(readings, key=lambda x: x['timestamp'])
        
        # Prepare data for each graph type
        graph_data = {}
        
        parameters = ['voltage', 'current', 'power', 'frequency', 'power_factor']
        
        for param in parameters:
            # Format the parameter name correctly for frontend
            frontend_param = 'powerFactor' if param == 'power_factor' else param
            
            # Format data for this parameter
            param_data = []
            
            for reading in sorted_readings:
                # Convert timestamp to readable format for display
                timestamp = datetime.fromisoformat(reading['timestamp'].replace('Z', '+00:00'))
                display_time = timestamp.strftime('%b %d %H:%M')
                full_time = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                
                # Extract parameter value
                param_value = reading[param]
                
                # Check if this is an anomaly for this parameter
                is_anomaly = reading.get('is_anomaly', False)
                anomaly_parameters = reading.get('anomaly_parameters', [])
                is_param_anomalous = is_anomaly and param in anomaly_parameters
                
                param_data.append({
                    'time': display_time,
                    'fullTime': full_time,
                    'timestamp': reading['timestamp'],
                    'value': param_value,
                    'is_anomaly': is_anomaly,
                    'anomaly_parameters': anomaly_parameters,
                    'is_param_anomalous': is_param_anomalous,
                    # Add the parameter value with the correct frontend name
                    frontend_param: param_value  
                })
            
            graph_data[frontend_param] = param_data
        
        return graph_data
    
    def format_duration(self, seconds):
        """Format duration in seconds to a human-readable string"""
        if seconds < 60:
            return f"{int(seconds)} seconds"
        
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        
        if minutes < 60:
            return f"{int(minutes)} min {int(remaining_seconds)} sec"
        
        hours = minutes // 60
        remaining_minutes = minutes % 60
        
        if hours < 24:
            return f"{int(hours)} hr {int(remaining_minutes)} min"
        
        days = hours // 24
        remaining_hours = hours % 24
        
        return f"{int(days)} days {int(remaining_hours)} hr"

# Example for user registration view
# Add these classes to your existing views.py file
# Make sure you keep all your existing code and add these classes at the end

class UserRegistrationView(APIView):
    """API endpoint for user registration"""
    
    def post(self, request):
        try:
            data = request.data
            
            # Check if user already exists
            existing_user = find_user_by_email(data['email'])
            if existing_user:
                return Response({
                    'message': 'User with this email already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Hash the password
            hashed_password = make_password(data['password'])
            
            # Store user in MongoDB
            user_data = {
                'email': data['email'],
                'name': data['name'],
                'password': hashed_password,
                'created_at': datetime.now().isoformat()
            }
            
            user_id = save_user(user_data)
            
            # Return success response
            return Response({
                'message': 'Registration successful',
                'user': {
                    'id': str(user_id),
                    'name': data['name'],
                    'email': data['email']
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserLoginView(APIView):
    """API endpoint for user login"""
    
    def post(self, request):
        try:
            data = request.data
            
            # Authenticate user
            user = authenticate_user(data['email'], data['password'])
            
            if not user:
                return Response({
                    'message': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Generate JWT token
            refresh = RefreshToken.for_user(User(email=user['email']))
            
            # Return user data and token
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': str(user['_id']),
                    'name': user['name'],
                    'email': user['email']
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['GET'])
def export_csv(request):
    """Export power readings as CSV"""
    try:
        # Get parameters from request
        node = request.query_params.get('node')
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        day = request.query_params.get('day')
        
        print(f"CSV Export requested for node: {node}, year: {year}, month: {month}, day: {day}")
        
        # Other parameter filters...
        
        if not node:
            return Response({"error": "Node parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get cache service
        cache_service = CacheService()
        firebase_service = FirebaseService()
        
        # Retrieve data from cache
        data = []
        
        try:
            if year and month and day:
                # Fetch specific day
                cached_data = cache_service.get(node, year, month, day)
                if cached_data:
                    data = cached_data
                    print(f"Found {len(data)} records for {node} on {year}-{month}-{day}")
                else:
                    print(f"No data found for {node} on {year}-{month}-{day}")
            elif year and month:
                # Fetch specific month
                data = firebase_service.get_month_data(node, year, month, use_cache=True)
                print(f"Retrieved {len(data)} records for {node} in {year}-{month}")
            elif year:
                # Fetch all data for a specific year
                for m in range(1, 13):
                    month_str = f"{m:02d}"
                    month_data = firebase_service.get_month_data(node, year, month_str, use_cache=True)
                    data.extend(month_data)
                print(f"Retrieved {len(data)} records for {node} in {year}")
            else:
                # Fetch ALL data for this node
                # First, get available years for this node
                years = firebase_service.get_years_for_node(node)
                print(f"Found years for {node}: {years}")
                
                for year in years:
                    # For each year, get available months
                    months = firebase_service.get_months_for_node_year(node, year)
                    print(f"Found months for {node} in {year}: {months}")
                    
                    for month in months:
                        # For each month, get data
                        month_data = firebase_service.get_month_data(node, year, month, use_cache=True)
                        data.extend(month_data)
                        print(f"Retrieved {len(month_data)} records for {node} in {year}-{month}")
                
                print(f"Retrieved {len(data)} total records for node {node}")
                
                # If still no data, use demo data as fallback
                if len(data) == 0:
                    print("No data found for node, using demo data as fallback")
                    data = [
                        {
                            "timestamp": int(datetime.now().timestamp() * 1000),
                            "voltage": 230.5,
                            "current": 2.5,
                            "power": 575.0,
                            "frequency": 60.0,
                            "power_factor": 0.95,
                            "node": node,
                            "is_anomaly": False
                        }
                    ]
        except Exception as cache_error:
            print(f"Error retrieving data from cache: {cache_error}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"Cache error: {str(cache_error)}"}, 
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        print(f"Retrieved {len(data)} records from cache")
        
        # Rest of your function remains the same...
        
        # Apply filters if provided
        filtered_data = data
        
        # Create CSV response with proper headers
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{node}_power_data.csv"'
        
        # Create CSV writer
        writer = csv.writer(response)
        
        # Write header
        headers = ['Node', 'Timestamp', 'Voltage (V)', 'Current (A)', 'Power (W)', 
                  'Frequency (Hz)', 'Power Factor', 'Is Anomaly']
        writer.writerow(headers)
        
        # Write data rows
        for row in filtered_data:
            try:
                # Handle different timestamp formats
                ts = row.get('timestamp', 0)
                
                if isinstance(ts, str):
                    # If timestamp is already a string (ISO format)
                    if 'T' in ts:
                        # Parse ISO format: 2025-04-18T12:34:56.789Z
                        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                        timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        # If it's already in the desired format, use it directly
                        timestamp = ts
                elif isinstance(ts, int) or isinstance(ts, float):
                    # Convert numeric timestamp (milliseconds since epoch)
                    dt = datetime.fromtimestamp(ts / 1000)  # Convert ms to seconds
                    timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    # Fallback for unexpected format
                    timestamp = str(ts)
                
                # Get values with safe defaults
                node_value = row.get('node', node)
                voltage = row.get('voltage', '')
                current = row.get('current', '')
                power = row.get('power', '')
                frequency = row.get('frequency', '')
                power_factor = row.get('power_factor', '')
                is_anomaly = 'Yes' if row.get('is_anomaly', False) else 'No'
                
                # Write the row
                writer.writerow([
                    node_value,
                    timestamp,
                    voltage,
                    current,
                    power,
                    frequency,
                    power_factor,
                    is_anomaly
                ])
            except Exception as row_error:
                print(f"Error processing row: {row_error}, row data: {row}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"CSV export completed successfully with {len(filtered_data)} rows")
        return response
        
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Return the current user's profile data"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': 'Admin' if user.is_staff else 'User',
        # Add any other user fields you want to expose
    })