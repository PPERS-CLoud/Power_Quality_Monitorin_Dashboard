from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from .services.firebase_service import FirebaseService

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