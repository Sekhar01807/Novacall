const server = import.meta.env.VITE_SERVER_URL || 
    (import.meta.env.PROD 
        ? "https://novacall-backend.onrender.com" 
        : "http://localhost:8000");

export default server;
