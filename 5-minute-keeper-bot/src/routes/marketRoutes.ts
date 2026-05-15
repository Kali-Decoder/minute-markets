import { Router, Request, Response } from "express";
import { marketService } from "../service/marketService";

const router = Router();

function authorized(req: Request, res: Response, next: () => void) {
  const token = process.env.MARKET_SERVICE_ADMIN_TOKEN;
  if (!token) return next(); // Development fallback
  
  if (req.headers["x-admin-token"] !== token) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  next();
}

// 1. GET: Fetch current state details of the runner engine
router.get("/status", (req: Request, res: Response) => {
  res.json(marketService.getState());
});

// 2. POST: Start the automation manager engine loop
router.post("/start", authorized, (req: Request, res: Response) => {
  marketService.start({
    createEveryMs: 12 * 60_000, // Safe buffer allowing the 10m cycle to close fully
    lockAfterMs: 5 * 60_000,   // 5 minutes live betting window
    closeAfterMs: 5 * 60_000,  // 5 minutes lock settlement evaluation window
  });
  res.json({ message: "Service started successfully", state: marketService.getState() });
});

// 3. POST: Stop execution actions safely
router.post("/stop", authorized, (res: Response) => {
  marketService.stop();
  res.json({ message: "Service stopped cleanly", state: marketService.getState() });
});

export default router;