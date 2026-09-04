import { Router, type IRouter } from "express";
import { GetSolarHistoryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const UPSTREAM_URL = "https://api.meonix.me/api/history";

router.get("/solar/history", async (req, res) => {
  const apiKey = process.env["SOLAR_API_KEY"];

  if (!apiKey) {
    req.log.error("SOLAR_API_KEY is not configured");
    res.status(503).json({ message: "Solar API is not configured" });
    return;
  }

  try {
    const upstreamUrl = new URL(UPSTREAM_URL);
    upstreamUrl.searchParams.set("key", apiKey);

    const response = await fetch(upstreamUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      req.log.warn({ status: response.status }, "Solar API returned an error");
      res.status(502).json({ message: "Solar API is temporarily unavailable" });
      return;
    }

    const payload: unknown = await response.json();
    const data = GetSolarHistoryResponse.parse(payload);
    res.json(data);
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch solar history");
    res.status(502).json({ message: "Unable to load solar history" });
  }
});

export default router;