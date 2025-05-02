import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/LoginPage.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faSpinner } from '@fortawesome/free-solid-svg-icons';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Backend URL - replace with your actual API URL
  const API_URL = "http://localhost:8000/api";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Send login request to the backend
      const response = await axios.post(`${API_URL}/auth/login/`, {
        email: formData.email,
        password: formData.password
      });
      
      // Store the token in localStorage for authenticated requests
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      // Navigate to dashboard on successful login
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupRedirect = (e) => {
    e.preventDefault();
    navigate("/signup");
  };

  return (
    <div className="container">
      <div className="login-box">
        <h2 className="title">Power Monitor Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="label">Email:</label>
            <div className="input-wrapper">
              <FontAwesomeIcon icon={faUser} className="icon" />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email" 
                className="input" 
              />
            </div>
          </div>
          
          <div className="input-group">
            <label className="label">Password:</label>
            <div className="input-wrapper">
              <FontAwesomeIcon icon={faLock} className="icon" />
              <input 
                type="password"
                name="password" 
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password" 
                className="input" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="sign-in-button" 
            disabled={loading}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="icon" />
                Signing In...
              </>
            ) : "Sign In"}
          </button>
        </form>
        
        <p className="signup-text">
          Don't have an account? <a href="#" className="signup-link" onClick={handleSignupRedirect}>Sign up here!</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;