import * as path from "path";

export const PROJECT_ROOT = path.join(__dirname, "..", "..");
export const DEPLOYMENTS_DIR = path.join(PROJECT_ROOT, "deployments");
export const DEPLOYMENT_FACTORY_JSON = path.join(DEPLOYMENTS_DIR, "factory.json");
export const DEPLOYMENT_MARKET_JSON = path.join(DEPLOYMENTS_DIR, "market.json");

