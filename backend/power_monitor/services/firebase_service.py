import os
import firebase_admin
from firebase_admin import credentials, db

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
        # Should be (looking at your workspace files)
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

# class AggregatedNodeDataView(APIView):
#     """API endpoint for retrieving aggregated node data"""
    
#     def get(self, request):
#         """Get aggregated data for a node within a date range"""
#         node_id = request.query_params.get('node')
#         start_date = request.query_params.get('start_date')
#         end_date = request.query_params.get('end_date')
#         resolution = request.query_params.get('resolution', 'hour')  # 'minute', 'hour', 'day'
        
#         if not all([node_id, start_date, end_date]):
#             return Response(
#                 {"error": "Missing parameters"}, 
#                 status=status.HTTP_400_BAD_REQUEST
#             )
            
#         try:
#             firebase_service = FirebaseService()
#             db_ref = firebase_service.db_ref
            
#             # Convert date strings to datetime objects
#             start_dt = datetime.strptime(start_date, "%Y-%m-%d")
#             end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
#             # Calculate date difference
#             date_diff = (end_dt - start_dt).days
            
#             # Automatically adjust resolution based on date range
#             if date_diff > 30:
#                 resolution = 'day'  # Use daily aggregation for ranges > 30 days
#             elif date_diff > 7:
#                 resolution = 'hour'  # Use hourly aggregation for ranges > 7 days
                
#             # Fetch and aggregate data
#             aggregated_data = firebase_service.get_aggregated_readings(
#                 node_id, start_date, end_date, resolution
#             )
            
#             return Response(aggregated_data)
            
#         except Exception as e:
#             return Response(
#                 {"error": f"Failed to fetch aggregated data: {str(e)}"},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )