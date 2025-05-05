/**
 * Data Version API Routes
 * 
 * These routes provide access to data versions for client-side versioning.
 */
import express from "express";
import { getAllVersions } from "../services/dataVersion";

const router = express.Router();

// Get all data versions
router.get("/", async (req, res) => {
  try {
    // Disable caching for this endpoint to ensure clients always get latest versions
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    const versions = await getAllVersions();
    res.json(versions);
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({ message: "Failed to fetch data versions" });
  }
});

export default router;