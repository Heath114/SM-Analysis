import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./app.css";

const theme = localStorage.getItem("pb-theme");
if (theme) document.documentElement.setAttribute("data-theme", theme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
