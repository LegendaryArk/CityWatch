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

app.post("/api/reports", async (req, res) => {
    try {
        const { image_url, latitude, longitude, issue_type, severity } = req.body
        if (!image_url || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: "Missing required fields" })
        }
        const { data, error } = await supabase
            .from("reports")
            .insert([{ image_url, latitude, longitude, issue_type: issue_type || null, severity: severity || null }])
            .select()
        if (error) { console.log('Supabase error:', error); return res.status(400).json({ error: error.message }) }
        res.json({ success: true, data: data[0] })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.listen(3001, ()=>{
    console.log("Server running on port 3001")
})