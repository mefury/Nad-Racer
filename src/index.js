import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@rainbow-me/rainbowkit/styles.css"; // RainbowKit styles
import "./index.css"; // Tailwind styles

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);