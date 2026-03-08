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

// Fetch weather from OpenWeatherMap One Call API 3.0
async function getWeather(lat, lon, timestampISO) {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY
        if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set")

        const reportDate = new Date(timestampISO)
        const unixTs = Math.floor(reportDate.getTime() / 1000)

        // Fetch weather at the exact report timestamp
        const timeRes = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${unixTs}&appid=${apiKey}&units=metric`
        )
        const timeData = await timeRes.json()
        const point = timeData.data?.[0]

        const temp             = point?.temp          ?? null
        const humidity         = point?.humidity      ?? null
        const wind_speed       = point?.wind_speed    ?? null
        const rainfall         = point?.rain?.["1h"]  ?? 0
        const snowfall         = point?.snow?.["1h"]  ?? 0
        const weather_conditions = point?.weather?.[0]?.description ?? null

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

        // Run CV classification and weather fetch in parallel
        const [cvResult, weather] = await Promise.all([
            classifyImage(image_url),
            getWeather(latitude, longitude, timestamp),
        ])

        console.log("CV result:", cvResult)
        console.log("Weather:", weather)

        const { data, error } = await supabase
            .from("reports")
            .insert([{
                image_url,
                loc: `SRID=4326;POINT(${longitude} ${latitude})`,
                issue_type:    cvResult.prediction,
                severity:      cvResult.confidence,
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

// ============= HEATMAP =============

app.get("/api/heatmap", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("reports")
            .select("ST_X(loc) as longitude, ST_Y(loc) as latitude, severity")

        if (error) return res.status(400).json({ error: error.message })

        const GRID_SIZE = 0.001  // ~100m cells
        const grid = {}

        data.forEach(r => {
            if (r.latitude == null || r.longitude == null) return
            const gLat = Math.round(r.latitude  / GRID_SIZE) * GRID_SIZE
            const gLon = Math.round(r.longitude / GRID_SIZE) * GRID_SIZE
            const key  = `${gLat.toFixed(4)},${gLon.toFixed(4)}`

            if (!grid[key]) grid[key] = { lat: gLat, lon: gLon, count: 0, totalSeverity: 0 }
            grid[key].count++
            grid[key].totalSeverity += r.severity ?? 1
        })

        const heatmapData = Object.values(grid).map(cell => ({
            latitude:     cell.lat,
            longitude:    cell.lon,
            issue_count:  cell.count,
            avg_severity: cell.totalSeverity / cell.count,
        }))

        res.json({ success: true, data: heatmapData })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ============= PREDICTIONS =============

app.get("/api/predictions", async (req, res) => {
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
