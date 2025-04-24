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