// Debug script to identify issues with the Input component in AdminPanel
console.log("Starting debug for Admin Components issue...");

// Import required components
import { createApp } from "vue";
import AdminPanel from "./src/components/admin/AdminPanel.vue";
import { Input, Button, Toast, Dialog } from "./src/components/ui";
import { Input as InputBase } from "./src/components/ui/base";

// Check if components are properly defined
console.log("Checking component imports:");
console.log("Input from ./src/components/ui:", Input);
console.log("Input from ./src/components/ui/base:", InputBase);
console.log("Button:", Button);
console.log("Toast:", Toast);
console.log("Dialog:", Dialog);

// Create a simple app to mount and check for errors
const app = createApp({
  components: {
    AdminPanel,
    Input,
    Button,
    Toast,
    Dialog,
  },
  template: `
    <div>
      <h1>Admin Component Debug</h1>
      <Input label="Test Input" placeholder="Test Input" />
      <Button>Test Button</Button>
      <AdminPanel />
    </div>
  `,
});

// Mount the app and catch any errors
try {
  const div = document.createElement("div");
  document.body.appendChild(div);
  app.mount(div);
  console.log("App mounted successfully");
} catch (error) {
  console.error("Error mounting app:", error);
}

// Check import resolution in ui/index.ts
import * as UIComponents from "./src/components/ui";
console.log("UI Components exports:", Object.keys(UIComponents));

// Check if base components are properly exported
import * as BaseComponents from "./src/components/ui/base";
console.log("Base UI Components exports:", Object.keys(BaseComponents));
