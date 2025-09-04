import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Event type:', typeof event.reason);
  console.error('Event constructor:', event.reason?.constructor?.name);
  
  // Handle DOMException specifically
  if (event.reason instanceof DOMException) {
    console.error('DOMException details:', {
      name: event.reason.name,
      message: event.reason.message,
      code: event.reason.code
    });
  }
  
  // Handle empty objects
  if (typeof event.reason === 'object' && event.reason !== null && Object.keys(event.reason).length === 0) {
    console.error('Empty error object detected - this should not happen');
    console.error('Stack trace:', new Error().stack);
  }
  
  event.preventDefault(); // Prevent the default browser behavior
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  console.error('Error type:', typeof event.error);
  console.error('Event details:', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    message: event.message
  });
});

createRoot(document.getElementById("root")!).render(<App />);
