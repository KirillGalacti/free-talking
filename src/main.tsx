import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/500.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/800.css";
import "@fontsource/montserrat-alternates/400.css";
import "@fontsource/montserrat-alternates/500.css";
import "@fontsource/montserrat-alternates/600.css";
import "@fontsource/montserrat-alternates/700.css";
import "@fontsource/montserrat-alternates/800.css";
import App from "./App";
import "./index.css";
import "./styles/base.css";
import "./styles/setup.css";
import "./styles/session.css";
import "./styles/meeting.css";
import "./styles/report.css";
import "./styles/full-report.css";
import "./styles/replay.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
