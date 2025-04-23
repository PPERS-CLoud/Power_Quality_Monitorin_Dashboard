import React from "react";
import "../css/Sidebar.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faTable, faUser, faBolt } from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ onMenuClick }) => {
  return (
    <div className="sidebar">
      <h2 className="title">Power Monitoring</h2>
      <button onClick={() => onMenuClick("dashboard")}>
        <FontAwesomeIcon icon={faTachometerAlt} className="fa-icon" /> Dashboard
      </button>
      <button onClick={() => onMenuClick("powerReadings")}>
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