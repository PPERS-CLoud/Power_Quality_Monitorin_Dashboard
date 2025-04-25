from django.urls import path
from . import views

app_name = 'power_monitor'

urlpatterns = [
    path('', views.ElectricalParameterList.as_view(), name='home'),
    path('parameters/', views.ElectricalParameterList.as_view(), name='parameter-list'),
    path('parameters/<int:pk>/', views.ElectricalParameterDetail.as_view(), name='parameter-detail'),
    path('firebase/', views.FirebaseDataView.as_view(), name='firebase-data'),
    path('anomalies/', views.AnomalyDetectionView.as_view(), name='anomaly-detection'),
    path('available-nodes/', views.AvailableNodesView.as_view(), name='available-nodes'),
    path('node-date-range/', views.NodeDateRangeView.as_view(), name='node-date-range'),
    path('time-series/', views.TimeSeriesDataView.as_view(), name='time-series-data'),
    path('aggregated-data/', views.AggregatedNodeDataView.as_view(), name='aggregated-data'),
]