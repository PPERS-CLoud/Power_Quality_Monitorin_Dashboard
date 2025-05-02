from django.conf import settings
from .mongodb_helpers import get_mongo_db

def save_user(user_data):
    """Save user to MongoDB"""
    mongo_db = get_mongo_db()
    if not mongo_db:
        raise Exception("MongoDB connection not available")
    
    users_collection = mongo_db['users']
    result = users_collection.insert_one(user_data)
    return result.inserted_id

def find_user_by_email(email):
    """Find user by email"""
    mongo_db = get_mongo_db()
    if not mongo_db:
        raise Exception("MongoDB connection not available")
    
    users_collection = mongo_db['users']
    return users_collection.find_one({"email": email})

def authenticate_user(email, password):
    """Authenticate user"""
    from django.contrib.auth.hashers import check_password
    
    mongo_db = get_mongo_db()
    if not mongo_db:
        raise Exception("MongoDB connection not available")
    
    user = find_user_by_email(email)
    
    if user and check_password(password, user['password']):
        return user
    
    return None