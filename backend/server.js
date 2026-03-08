require("dotenv").config()
const express = require("express")
const cors = require("cors")
const supabase = require("./supabaseClient")

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get("/", (req, res) => {
    res.send("API running")
})

// ============= HELPERS =============

// Call the Python CV classification API with an image URL
async function classifyImage(imageUrl) {
    try {
        const imageRes = await fetch(imageUrl)
        const imageBuffer = await imageRes.arrayBuffer()
        const imageBlob = new Blob([imageBuffer], { type: "image/jpeg" })

        const formData = new FormData()
        formData.append("file", imageBlob, "image.jpg")

        const cvRes = await fetch(process.env.CV_API_URL || "http://localhost:8000/predict", {
            method: "POST",
            body: formData,
        })

        if (!cvRes.ok) throw new Error(`CV API responded ${cvRes.status}`)
        return await cvRes.json() // { prediction, confidence }
    } catch (err) {
        console.error("CV classification failed:", err.message)
        return { prediction: null, confidence: null }
    }
}

// Call Gemini Vision API to classify severity (0.0 - 1.0) from an image URL
async function classifySeverityWithGemini(imageUrl) {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            console.warn("GEMINI_API_KEY not configured")
            return { severity: null }
        }

        // Fetch image and convert to base64
        const imageRes = await fetch(imageUrl)
        const imageBuffer = await imageRes.arrayBuffer()
        const base64 = Buffer.from(imageBuffer).toString("base64")

        const body = {
            contents: [{
                parts: [
                    {
                        text: "You are a road infrastructure damage assessor. Analyze this image and rate the severity of the road damage on a scale from 0.0 to 1.0, where 0.0 means no visible damage and 1.0 means catastrophic/extremely severe damage requiring immediate repair. Consider factors like pothole depth, crack extent, surface deterioration, and safety risk. Respond with ONLY a JSON object in this exact format: {\"severity\": 0.7}"
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64,
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 64,
            }
        }

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        )

        if (!geminiRes.ok) {
            const errBody = await geminiRes.text()
            throw new Error(`Gemini API responded ${geminiRes.status}: ${errBody}`)
        }

        const geminiData = await geminiRes.json()
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

        // Extract JSON from response (Gemini may wrap it in markdown)
        const match = text.match(/\{[^}]*"severity"\s*:\s*([\d.]+)[^}]*\}/)
        if (!match) throw new Error(`Unexpected Gemini response: ${text}`)

        const severity = parseFloat(match[1])
        if (isNaN(severity) || severity < 0 || severity > 1) throw new Error(`Invalid severity value: ${match[1]}`)

        return { severity }
    } catch (err) {
        console.error("Gemini severity classification failed:", err.message)
        return { severity: null }
    }
}

// Fetch weather from OpenWeatherMap One Call API 3.0
// Uses day_summary for rainfall/snowfall totals (full-day, not just the upload hour)
async function getWeather(lat, lon, timestampISO) {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY
        if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set")

        const reportDate = new Date(timestampISO)
        const unixTs = Math.floor(reportDate.getTime() / 1000)
        const reportDateStr = reportDate.toISOString().split("T")[0]

        // Fetch point-in-time data (temp, humidity, wind, conditions) and full-day summary in parallel
        const [timeRes, daySummaryRes] = await Promise.all([
            fetch(
                `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${unixTs}&appid=${apiKey}&units=metric`
            ),
            fetch(
                `https://api.openweathermap.org/data/3.0/onecall/day_summary?lat=${lat}&lon=${lon}&date=${reportDateStr}&appid=${apiKey}&units=metric`
            ),
        ])

        const [timeData, dayData] = await Promise.all([timeRes.json(), daySummaryRes.json()])

        const point = timeData.data?.[0]
        const temp               = point?.temp          ?? null
        const humidity           = point?.humidity      ?? null
        const wind_speed         = point?.wind_speed    ?? null
        const weather_conditions = point?.weather?.[0]?.description ?? null

        // Use full-day precipitation totals from day_summary
        const rainfall = dayData.precipitation?.total ?? 0
        const snowfall = dayData.snow?.total           ?? 0

        // Fetch daily summaries for the 7 days before — needed for freeze-thaw count
        const dailyFetches = []
        for (let i = 1; i <= 7; i++) {
            const d = new Date(reportDate)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split("T")[0]
            dailyFetches.push(
                fetch(
                    `https://api.openweathermap.org/data/3.0/onecall/day_summary?lat=${lat}&lon=${lon}&date=${dateStr}&appid=${apiKey}&units=metric`
                ).then(r => r.json())
            )
        }
        const days = await Promise.all(dailyFetches)

        let freeze_thaw_cycles = 0
        for (const day of days) {
            const min = day.temperature?.min
            const max = day.temperature?.max
            if (min != null && max != null && min < 0 && max > 0) {
                freeze_thaw_cycles++
            }
        }

        return { temp, humidity, wind_speed, rainfall, snowfall, freeze_thaw_cycles, weather_conditions }
    } catch (err) {
        console.error("Weather fetch failed:", err.message)
        return { temp: null, humidity: null, wind_speed: null, rainfall: null, snowfall: null, freeze_thaw_cycles: null, weather_conditions: null }
    }
}

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

// ============= REPORT ENDPOINTS =============

app.post("/api/reports", async (req, res) => {
    try {
        const { image_url, latitude, longitude, photo_timestamp, user_id } = req.body

        if (!image_url || latitude == null || longitude == null) {
            return res.status(400).json({ error: "Missing required fields: image_url, latitude, longitude" })
        }

        const timestamp = photo_timestamp || new Date().toISOString()

        // Run CV classification, Gemini severity, and weather fetch in parallel
        const [cvResult, geminiResult, weather] = await Promise.all([
            classifyImage(image_url),
            classifySeverityWithGemini(image_url),
            getWeather(latitude, longitude, timestamp),
        ])

        console.log("CV result:", cvResult)
        console.log("Gemini severity:", geminiResult)
        console.log("Weather:", weather)

        // Severity comes from Gemini only (0.0–1.0). CV confidence is a separate classification metric.
        const severity = geminiResult.severity ?? null

        const { data, error } = await supabase
            .from("reports")
            .insert([{
                image_url,
                loc: `SRID=4326;POINT(${longitude} ${latitude})`,
                issue_type:    cvResult.prediction,
                severity,
                created_at:    timestamp,
                user_id:       user_id || null,
                temp:          weather.temp,
                humidity:      weather.humidity,
                wind_speed:    weather.wind_speed,
                rainfall:      weather.rainfall,
                snowfall:      weather.snowfall,
                freeze_thaw_cycles: weather.freeze_thaw_cycles,
                weather_conditions: weather.weather_conditions,
            }])
            .select()

        if (error) {
            console.error("Supabase insert error:", error)
            return res.status(400).json({ error: error.message })
        }

        res.json({ success: true, data: data[0] })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.get("/api/reports", async (req, res) => {
    try {
        const { limit = 100, offset = 0, user_id } = req.query

        let query = supabase
            .from("reports")
            .select("id, image_url, issue_type, severity, status, created_at, user_id, ST_X(loc) as longitude, ST_Y(loc) as latitude")
            .order("created_at", { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1)

        if (user_id) query = query.eq("user_id", user_id)

        const { data, error } = await query
        if (error) return res.status(400).json({ error: error.message })

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
            .select("*, ST_X(loc) as longitude, ST_Y(loc) as latitude")
            .eq("id", id)
            .single()

        if (error) return res.status(404).json({ error: "Report not found" })
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= STATS =============

app.get("/api/stats", async (req, res) => {
    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const [activeRes, resolvedRes, issueTypesRes, totalRes] = await Promise.all([
            // Active = not resolved
            supabase
                .from("reports")
                .select("id", { count: "exact", head: true })
                .neq("status", "resolved"),
            // Resolved this week
            supabase
                .from("reports")
                .select("id", { count: "exact", head: true })
                .eq("status", "resolved")
                .gte("created_at", oneWeekAgo),
            // Issue type breakdown
            supabase
                .from("reports")
                .select("issue_type")
                .not("issue_type", "is", null),
            // Total
            supabase
                .from("reports")
                .select("id", { count: "exact", head: true }),
        ])

        const active_count      = activeRes.count  ?? 0
        const resolved_this_week = resolvedRes.count ?? 0
        const total_count        = totalRes.count    ?? 0

        // Tally issue types
        const issueCounts = {}
        for (const row of issueTypesRes.data ?? []) {
            const t = row.issue_type
            issueCounts[t] = (issueCounts[t] ?? 0) + 1
        }

        res.json({
            success: true,
            data: {
                active_count,
                resolved_this_week,
                total_count,
                issue_type_counts: issueCounts,
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= HEATMAP =============

// period: "current" | "30d" | "90d" | "365d"
// Maps to columns: avg_severity | predict_30d | predict_90d | predict_365d
const PERIOD_COLUMN = {
    current: "avg_severity",
    "30d":   "predict_30d",
    "90d":   "predict_90d",
    "365d":  "predict_365d",
}

app.get("/api/heatmap", async (req, res) => {
    try {
        const period = req.query.period ?? "current"
        const valueCol = PERIOD_COLUMN[period] ?? "avg_severity"

        const { data, error } = await supabase
            .from("heatmap_tiles")
            .select("grid_cell, issue_count, avg_severity, predict_30d, predict_90d, predict_365d")
            .order(valueCol, { ascending: false })

        if (error) return res.status(400).json({ error: error.message })

        const heatmapData = (data ?? []).map(row => {
            // grid_cell is stored as GeoJSON {type:"Point", coordinates:[lon,lat]}
            // or as a WKT/WKB string depending on column type — handle both
            let longitude = null, latitude = null
            const gc = row.grid_cell
            if (gc && typeof gc === "object" && gc.coordinates) {
                ;[longitude, latitude] = gc.coordinates
            } else if (gc && typeof gc === "object" && gc.type === "Point") {
                ;[longitude, latitude] = gc.coordinates
            }
            if (longitude == null || latitude == null) return null

            return {
                latitude,
                longitude,
                issue_count:   row.issue_count,
                value:         row[valueCol] ?? 0,
                avg_severity:  row.avg_severity,
                predict_30d:   row.predict_30d,
                predict_90d:   row.predict_90d,
                predict_365d:  row.predict_365d,
            }
        }).filter(Boolean)

        res.json({ success: true, data: heatmapData })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= PREDICTIONS =============

app.get("/api/predictions", async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from("predictions")
            .select("*, ST_X(loc) as longitude, ST_Y(loc) as latitude")
            .order("created_at", { ascending: false })
            .limit(500)

        if (error) return res.status(400).json({ error: error.message })
        res.json({ success: true, data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
