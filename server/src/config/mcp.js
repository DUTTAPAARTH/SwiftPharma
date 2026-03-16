import { initializeMedicalMCPClient } from "../utils/medicalMCP.js";

let mcpInitialized = false;

export const initializeMedicalMCP = async () => {
  if (mcpInitialized) {
    return;
  }

  const enabled =
    String(process.env.MEDICAL_MCP_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) {
    console.log("[medical-mcp] disabled via MEDICAL_MCP_ENABLED=false");
    return;
  }

  await initializeMedicalMCPClient();
  mcpInitialized = true;
  console.log("[medical-mcp] initialized");
};
