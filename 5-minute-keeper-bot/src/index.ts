import express from "express";
import cors from "cors"; // ✅ Import CORS
import * as dotenv from "dotenv";
import marketRouter from "./routes/marketRoutes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Allow your frontend app domain to query this API securely
app.use(cors({
  origin: ["http://localhost:3000", "https://minute-markets.netlify.app/"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-admin-token"]
}));

app.use(express.json());
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