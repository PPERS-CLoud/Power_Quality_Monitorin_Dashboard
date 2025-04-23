import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import PowerReadings from "../components/PowerReadings";
import Dashboard from "../components/Dashboard";
// import RealtimePowerReadings from "../components/RealtimePowerReadings";
import "../css/MainContent.css";

const MainContent = () => {
  const [activeContent, setActiveContent] = useState("dashboard");

  const renderContent = () => {
    switch (activeContent) {
      case "dashboard":
        return <Dashboard />;
      case "powerReadings":
        return <PowerReadings />;
      case "settings":
        return <h2>Settings Content</h2>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="main-content">
      <Sidebar onMenuClick={setActiveContent} />
      <div className="divider">
        <div className="content-area">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MainContent;