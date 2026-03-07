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

app.listen(3001, ()=>{
    console.log("Server running on port 3001")
})