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