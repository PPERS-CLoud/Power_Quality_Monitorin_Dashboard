import React, { useState, useEffect } from "react";
import "../css/Sidebar.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faTable, faUser, faBolt, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const Sidebar = ({ onMenuClick }) => {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [user, setUser] = useState({
    name: "Loading...",
    role: "..."
  });

  // Calculate user initials from name
  const userInitials = user.name ? user.name.charAt(0).toUpperCase() : "?";

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // First try to get user data from localStorage
        const userData = localStorage.getItem('user');
        
        if (userData) {
          // Parse the JSON data
          const user = JSON.parse(userData);
          
          setUser({
            name: user.name || "User",
            role: "User"  // You can add role to your user object in the backend
          });
          
          return; // Exit early if we have user data
        }
        
        // If no local data, try API as fallback (which is currently failing)
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}auth/user-profile/`, {
            headers: {
              'Authorization': `Bearer ${token}`  // Note: changed to Bearer token format
            }
          });
          
          if (response.data) {
            setUser({
              name: response.data.username || response.data.email || "User",
              role: response.data.role || "User"
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUser({
          name: "Guest",
          role: "Not logged in"
        });
      }
    };
  
    fetchUserProfile();
  }, []);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    onMenuClick(menu);
  };

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user'); // Also remove user data
    
    // Redirect to login page
    window.location.href = '/';
  };

  return (
    <div className="sidebar">
      <h2 className="title">Power Monitoring</h2>
      <button 
        className={activeMenu === "Dashboard" ? "active" : ""} 
        onClick={() => handleMenuClick("Dashboard")}
      >
        <FontAwesomeIcon icon={faTachometerAlt} className="fa-icon" /> Dashboard
      </button>
      <button 
        className={activeMenu === "powerReadings" ? "active" : ""} 
        onClick={() => handleMenuClick("powerReadings")}
      >
        <FontAwesomeIcon icon={faTable} className="fa-icon" /> Tabled Data
      </button>
      <div className="user-container">
        <div className="profile">
          <div className="profile-avatar">
            {userInitials}
          </div>
          <div className="profile-info">
            <p className="profile-name">{user.name}</p>
            <p className="profile-access">{user.role}</p>
          </div>
        </div>
      </div>
      <button 
          className="logout-button-full" 
          onClick={handleLogout}
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="fa-icon" /> Logout
        </button>
    </div>
  );
};

export default Sidebar;