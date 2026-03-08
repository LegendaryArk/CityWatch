require("dotenv").config()
const express = require("express")
const cors = require("cors")
const supabase = require("./supabaseClient")

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get("/", (req,res)=>{
    res.send("API running")
})

// ============= USER ENDPOINTS =============

app.post("/api/users", async (req, res) => {
    try {
        const { id, email } = req.body
        if (!id || !email) return res.status(400).json({ error: "Missing id or email" })

        const { data, error } = await supabase
            .from("users")
            .upsert([{ id, email }], { onConflict: "id" })
            .select()

        if (error) return res.status(400).json({ error: error.message })
        res.json({ success: true, data: data[0] })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= POST ENDPOINTS =============

app.post("/api/reports", async (req, res) => {
    try {
        const { image_url, latitude, longitude, issue_type, severity, user_id } = req.body
        if (!image_url || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: "Missing required fields: image_url, latitude, longitude" })
        }
        const { data, error } = await supabase
            .from("reports")
            .insert([{ image_url, latitude, longitude, issue_type: issue_type || null, severity: severity || null, user_id: user_id || null }])
            .select()
        if (error) { console.log('Supabase error:', error); return res.status(400).json({ error: error.message }) }
        res.json({ success: true, data: data[0] })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= GET ENDPOINTS =============

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

app.get("/api/heatmap", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("reports")
            .select("latitude, longitude, severity")

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const gridSize = 0.01
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

app.get("/api/users/:id/reports", async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        // Fetch reports for the given user, ordered by creation date
        const { data: reports, error: reportsError, count } = await supabase
            .from("reports")
            .select("*", { count: 'exact' })
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (reportsError) {
            return res.status(400).json({ error: reportsError.message });
        }

        res.json({ success: true, data: reports, count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.listen(3001, ()=>{
    console.log("Server running on port 3001")
})