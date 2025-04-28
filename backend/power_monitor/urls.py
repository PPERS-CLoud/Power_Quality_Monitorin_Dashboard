from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnomalyDetectionView,
    FirebaseDataView,
    FirebaseNodesView,
    FirebaseCompareView,
    NodeDateRangeView,
    # Add these new imports
    CacheStatsView,
    ClearCacheView,
    CachedNodesView,
    YearsForNodeView,
    MonthsForNodeYearView,
    DaysForNodeYearMonthView,
    NodeDataView,
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

    # Add new cache endpoints
    path('cache/stats/', CacheStatsView.as_view(), name='cache-stats'),
    path('cache/clear/', ClearCacheView.as_view(), name='clear-cache'),
    path('cache/nodes/', CachedNodesView.as_view(), name='cached-nodes'),
    path('firebase/years/', YearsForNodeView.as_view(), name='years-for-node'),
    path('firebase/months/', MonthsForNodeYearView.as_view(), name='months-for-node-year'),
    path('firebase/days/', DaysForNodeYearMonthView.as_view(), name='days-for-node-year-month'),
    path('firebase/node-data/', NodeDataView.as_view(), name='node-data'),
]