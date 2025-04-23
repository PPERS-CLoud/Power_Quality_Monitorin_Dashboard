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