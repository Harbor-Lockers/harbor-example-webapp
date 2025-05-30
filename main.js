import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path'


dotenv.config();
const app = express();
const __dirname = path.resolve()
app.use(express.json());
app.use(cors());
// This is for the access token request
const Access_token_url =
  "https://accounts.sandbox.harborlockers.com/realms/harbor/protocol/openid-connect/token";
const DropoffApi =
  "https://api.sandbox.harborlockers.com/api/v1/locker-open-requests/dropoff-locker-request";
const pickupApi =
  "https://api.sandbox.harborlockers.com/api/v1/locker-open-requests/pickup-locker-request";
let token = "";


// Serve all static files from the current directory
app.use(express.static(path.join(__dirname, 'public')));



const params = new URLSearchParams();
params.append("grant_type", "client_credentials");
params.append("scope", "service_provider");
params.append("client_id", `${process.env.CLIENT_ID}`);
params.append("client_secret", `${process.env.CLIENT_SECRET}`);

// get an access token
app.post("/access-token", async (req, res) => {
  console.log("access-token route hit");

  const bodyParams = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "service_provider",
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
  });

  try {
    const response = await fetch(Access_token_url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });
    const data = await response.json();
    token = data.access_token;
    console.log("token is", token);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// call the locker open api
app.post("/dropoff-request", async (req, res) => {
  try {
    const response = await fetch(DropoffApi, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: 27, // use your location id, this can be found on harbor admin
        lockerTypeId: 1, // locker types, 1 for small, 2 for medium, 3 for large 
        requireLowLocker: false,
        returnUrl: "https://yourwebsite.com/successpage", // where to send the user after the dropoff 
        clientInfo: "Customer name/order number", 
        payload: {},
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//call the pickup api
app.post("/pickup-request", async (req, res) => {
  try {
    const { lockerId } = req.body;

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
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(3000, () => console.log("started"));
