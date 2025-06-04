import express from "express"
import fetch from "node-fetch"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"

dotenv.config()
const app = express()
const __dirname = path.resolve()
app.use(express.json())
app.use(cors())

// API URLs, these need to be changed if you are moving to prod
const Access_token_url = "https://accounts.sandbox.harborlockers.com/realms/harbor/protocol/openid-connect/token"
const DropoffApi = "https://api.sandbox.harborlockers.com/api/v1/locker-open-requests/dropoff-locker-request"
const pickupApi = "https://api.sandbox.harborlockers.com/api/v1/locker-open-requests/pickup-locker-request"
const getClosestLocationApi = "https://api.sandbox.harborlockers.com/api/v1/locations/closest"

let token = ""
let userLocation = []
let userLocationID = ""

app.use(express.static(path.join(__dirname, "public")))

// Get an access token
app.post("/access-token", async (req, res) => {
  console.log("access-token route hit")

  const bodyParams = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "service_provider",
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
  })

  try {
    const response = await fetch(Access_token_url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    })
    const data = await response.json()
    token = data.access_token
    console.log("token is", token)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint to get closest location based on user coordinates
app.post("/get-closest-location", async (req, res) => {
  try {
    const { latitude, longitude } = req.body

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" })
    }

    if (!token) {
      return res.status(401).json({ error: "No access token available. Please request a token first." })
    }

    console.log(`Finding closest location for coordinates: ${latitude}, ${longitude}`)

    const response = await fetch(
      `${getClosestLocationApi}?lat=${latitude}&lon=${longitude}&radius=0.9`, 
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const data = await response.json()

    if (response.ok) {
      // Store the user location and location ID
      userLocation = [latitude, longitude]
      userLocationID = data.id

      console.log("Closest location found:", data.id)
      console.log("User location stored:", userLocation)
      console.log("Location ID stored:", userLocationID)
    }

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// dropoff request 
app.post("/dropoff-request", async (req, res) => {
  try {
    const { lockerTypeId } = req.body // Extract lockerTypeId from request body
    const locationId = userLocationID

    // Validate that lockerTypeId is provided
    if (!lockerTypeId) {
      return res.status(400).json({ error: "lockerTypeId is required" })
    }

    console.log("Using location ID:", locationId)
    console.log("Using locker type ID:", lockerTypeId)

    const response = await fetch(DropoffApi, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: locationId,
        lockerTypeId: lockerTypeId, // locker size is used here
        requireLowLocker: false,
        returnUrl: "https://yourwebsite.com/successpage", // change this to your website
        clientInfo: "Customer name/order number", // set this to track whose order is whose
        payload: {},
      }),
    })

    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/pickup-request", async (req, res) => {
  try {
    const { lockerId } = req.body

    const response = await fetch(pickupApi, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lockerId,
        returnUrl: "",
        clientInfo: "",
        payload: {},
      }),
    })

    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => console.log("Server started on port 3000"))
