import express from "express";
import * as dotenv from "dotenv";
import marketRouter from "./routes/marketRoutes";
import { marketService } from "./service/marketService";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Apply health status entry and operational API prefixes
app.use("/api/market-service", marketRouter);

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
app.listen(PORT, () => {
    console.log(`🌐 Server listening securely on port ${PORT}`);
    
    // ✅ AUTOMATICALLY START ON BOOT:
    const defaultIntervals = { 
      createEveryMs: 10 * 60_000, 
      lockAfterMs: 5 * 60_000, 
      closeAfterMs: 5 * 60_000 
    };
    
    marketService.start(defaultIntervals);
  });