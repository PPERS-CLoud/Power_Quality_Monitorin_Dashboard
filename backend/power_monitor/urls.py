from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'power_monitor'

# Create a router for the ViewSet (Option 1)
router = DefaultRouter()
router.register(r'firebase', views.FirebaseViewSet, basename='firebase')

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Or use separate URL patterns for APIViews (Option 2)
    path('firebase/data/', views.FirebaseDataView.as_view(), name='firebase-data'),
    path('firebase/nodes/', views.FirebaseNodesView.as_view(), name='firebase-nodes'),
    path('firebase/compare/', views.FirebaseCompareView.as_view(), name='firebase-compare'),
]