import { createApp } from "vue";
import App from "./App.vue";
import { vTouch } from "@/directives/touch-directives";

// Basis-CSS und Design-System importieren
import "@/assets/variables.css";
import "@/assets/responsive.css";

// Mobile-Optimierungen und Styling importieren
import "./mobile.scss";

// App erstellen
const app = createApp(App);

// Touch-Direktiven registrieren
app.directive("touch", vTouch);

// App mounten
app.mount("#app");
