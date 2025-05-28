// Test script to check if the Input component is correctly exported
import * as UI from "./src/components/ui";
import * as Base from "./src/components/ui/base";

console.log("UI exports:", Object.keys(UI));
console.log("Base exports:", Object.keys(Base));
console.log("Input from UI:", UI.Input);
console.log("Input from Base:", Base.Input);
