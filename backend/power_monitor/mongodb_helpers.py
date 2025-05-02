from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)

def get_mongo_db():
    """
    Get MongoDB database connection, initializing it if necessary.
    """
    from django.conf import settings
    
    # If MongoDB is already configured in settings, return it
    if hasattr(settings, 'MONGO_DB') and settings.MONGO_DB is not None:
        return settings.MONGO_DB
    
    # Otherwise try to create a new connection
    try:
        # Updated connection string with the new MongoDB Atlas URL
        uri = "mongodb+srv://ctumcipqm:q6tklNRpnSm5sZUU@cluster0.a08mrpv.mongodb.net/USER_DATA?retryWrites=true&w=majority&appName=Cluster0"
        client = MongoClient(
            uri, 
            connectTimeoutMS=30000, 
            socketTimeoutMS=None, 
            connect=False
        )
        db = client['USER_DATA']
        
        # Test connection
        client.admin.command('ping')
        logger.info("MongoDB connection successful!")
        
        # Manually set settings.MONGO_DB if it doesn't exist
        settings.MONGO_DB = db
        return db
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        return None