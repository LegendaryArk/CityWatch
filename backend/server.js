require("dotenv").config()
const express = require("express")
const cors = require("cors")
const supabase = require("./supabaseClient")

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req,res)=>{
    res.send("API running")
})

// ============= POST ENDPOINTS =============

// POST /api/reports - Create a new report
app.post("/api/reports", async (req, res) => {
    try {
        const { image_url, latitude, longitude, issue_type, severity } = req.body

        // Validate required fields
        if (!image_url || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: "Missing required fields: image_url, latitude, longitude" })
        }

        const { data, error } = await supabase
            .from("reports")
            .insert([
                {
                    image_url,
                    latitude,
                    longitude,
                    issue_type: issue_type || null,
                    severity: severity || null
                }
            ])
            .select()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({ success: true, data: data[0] })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= GET ENDPOINTS =============

// GET /api/reports - Get all reports (with optional filters)
app.get("/api/reports", async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query

        const { data, error } = await supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// GET /api/heatmap - Get aggregated heatmap data
app.get("/api/heatmap", async (req, res) => {
    try {
        // Query: group reports by vicinity, calculate avg severity + count
        const { data, error } = await supabase
            .from("reports")
            .select("latitude, longitude, severity")

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        // Simple grid-based aggregation (you can use PostGIS for this later)
        const gridSize = 0.01 // ~1km at equator
        const heatmap = {}

        data.forEach(report => {
            if (report.severity !== null) {
                const gridKey = `${Math.round(report.latitude / gridSize) * gridSize},${Math.round(report.longitude / gridSize) * gridSize}`
                
                if (!heatmap[gridKey]) {
                    heatmap[gridKey] = { count: 0, totalSeverity: 0, lat: 0, lng: 0 }
                }
                heatmap[gridKey].count += 1
                heatmap[gridKey].totalSeverity += report.severity
                heatmap[gridKey].lat = report.latitude
                heatmap[gridKey].lng = report.longitude
            }
        })

        // Format for frontend
        const heatmapData = Object.entries(heatmap).map(([key, value]) => ({
            latitude: value.lat,
            longitude: value.lng,
            issue_count: value.count,
            avg_severity: value.totalSeverity / value.count
        }))

        res.json({ success: true, data: heatmapData })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// GET /api/predictions - Get predicted risk zones
app.get("/api/predictions", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("predictions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// GET /api/reports/:id - Get a specific report
app.get("/api/reports/:id", async (req, res) => {
    try {
        const { id } = req.params

        const { data, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single()

        if (error) {
            return res.status(404).json({ error: "Report not found" })
        }

        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.listen(3001, ()=>{
    console.log("Server running on port 3001")
})