import React, { useState, useEffect } from "react";
import "../css/Sidebar.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faTable, faUser, faBolt } from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ onMenuClick }) => {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    onMenuClick(menu);
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
      <div className="profile">
        <FontAwesomeIcon icon={faUser} className="fa-icon" />
        <div className="profile-info">
          <p className="profile-name">John Doe</p>
          <p className="profile-access">Admin</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;