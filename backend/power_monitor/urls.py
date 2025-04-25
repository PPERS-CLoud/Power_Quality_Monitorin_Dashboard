from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnomalyDetectionView,
    FirebaseDataView,
    FirebaseNodesView,
    FirebaseCompareView,
    NodeDateRangeView,
)

# Create a router and register our ViewSets
router = DefaultRouter()

# Define URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Direct view endpoints
    path('anomalies/', AnomalyDetectionView.as_view(), name='anomalies'),
    path('firebase/data/', FirebaseDataView.as_view(), name='firebase-data'),
    path('firebase/nodes/', FirebaseNodesView.as_view(), name='firebase-nodes'),
    path('firebase/compare/', FirebaseCompareView.as_view(), name='firebase-compare'),
    path('firebase/date-range/', NodeDateRangeView.as_view(), name='firebase-date-range'),

    # Add additional endpoints as needed
]