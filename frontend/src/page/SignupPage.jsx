import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/LoginPage.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faSpinner } from '@fortawesome/free-solid-svg-icons';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
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

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("All fields are required");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // Send signup request to the backend
      const response = await axios.post(`${API_URL}/auth/register/`, {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      // Show success and redirect to login
      alert("Registration successful! Please log in with your new account.");
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = (e) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="container">
      <div className="login-box">
        <h2 className="title">Create Account</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label className="label">Name:</label>
            <div className="input-wrapper">
              <FontAwesomeIcon icon={faUser} className="icon" />
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name" 
                className="input" 
              />
            </div>
          </div>
          
          <div className="input-group">
            <label className="label">Email:</label>
            <div className="input-wrapper">
              <FontAwesomeIcon icon={faEnvelope} className="icon" />
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
          
          <div className="input-group">
            <label className="label">Confirm Password:</label>
            <div className="input-wrapper">
              <FontAwesomeIcon icon={faLock} className="icon" />
              <input 
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password" 
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
                Creating Account...
              </>
            ) : "Sign Up"}
          </button>
        </form>
        
        <p className="signup-text">
          Already have an account? <a href="#" className="signup-link" onClick={handleLoginRedirect}>Login here!</a>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;