import React from "react";
import { Link } from "react-router-dom";

const Landing: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-4xl font-bold mb-4">Brainstorming Dashboard</h1>
      <p className="mb-6 text-gray-600">Collaborate with boards and cards.</p>
      <div className="space-x-4">
        <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded">
          Login
        </Link>
        <Link to="/signup" className="px-4 py-2 bg-gray-600 text-white rounded">
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default Landing;
