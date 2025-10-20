// server.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST","PATCH","DELETE"] }
});

app.use(cors());
app.use(express.json());

// ADD THIS BLOCK:
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} received.`);
  next();
});
// END ADDED BLOCK

// FIX: Ensure JWT_SECRET is loaded from .env. The user must define this variable.
const JWT_SECRET = process.env.JWT_SECRET || "e2b330f1f76c1f815f3301fec41efcf255907f4daf160c920e0be0ee60fd02dd"; 

// ---------- Helper: verify JWT ----------
const verifyJwt = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) return reject(err);
      resolve(payload);
    });
  });
};

// ---------- HTTP Auth middleware ----------
const authenticateToken = async (req, res, next) => {
  try {
    const header = req.headers["authorization"];
    const token = header && header.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });
    const payload = await verifyJwt(token);
    req.user = payload; // req.user now contains { email, name }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token", detail: err.message });
  }
};

// ---------- AUTH ROUTES ----------
app.post("/api/register", async (req, res) => {
  try {
    // Extract new fields from the request body
    const { email, password, name, department, year, bio, skills } = req.body;
    
    // Basic validation for essential fields
    if (!email || !password || !name) return res.status(400).json({ message: "email, password, and name are required" });
    
    // Check if user already exists
    const [existing] = await db.execute("SELECT email FROM profiles WHERE email = ?", [email]);
    if (existing.length) return res.status(400).json({ message: "User already registered" });
    
    const hashed = await bcrypt.hash(password, 10);
    
    // SQL INSERT statement updated to include all new columns
    const insertQuery = `
      INSERT INTO profiles (email, password_hash, name, department, year, bio, skills) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.execute(insertQuery, [
      email, 
      hashed, 
      name, 
      department || '', // Allow null/default if not provided
      year || 0, 
      bio || '', 
      skills || ''
    ]);
    
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// server.js (Around lines 87-99)

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Fetch user from DB
    const [rows] = await db.execute(
      "SELECT email, password_hash, name, created_at, department, year, bio, skills FROM profiles WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // 2️⃣ Compare password
    const match = await bcrypt.compare(password, user.password_hash);

    // 🔹 DEBUG LOGS: paste these lines right after bcrypt.compare
    console.log("🟢 Login attempt:", email);
    console.log("Entered password:", password);
    console.log("Stored hash:", user.password_hash);
    console.log("Password match result:", match);

    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      { email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 4️⃣ Send profile data
    const profileData = {
      id: user.email,
      email: user.email,
      full_name: user.name,
      created_at: user.created_at,
      department: user.department,
      year: user.year,
      bio: user.bio,
      skills: user.skills,
    };

    res.json({ token, user: profileData });

  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

app.patch("/api/profile", authenticateToken, async (req, res) => {
  try {
    // Extract new fields from the request body
    const { full_name, password, department, year, bio, skills } = req.body; 
    
    let fields = [];
    let values = [];
    
    if (full_name !== undefined) { fields.push("name = ?"); values.push(full_name); } // Check for undefined/null if you want to allow clearing
    if (department !== undefined) { fields.push("department = ?"); values.push(department); }
    if (year !== undefined) { fields.push("year = ?"); values.push(year); }
    if (bio !== undefined) { fields.push("bio = ?"); values.push(bio); }
    if (skills !== undefined) { fields.push("skills = ?"); values.push(skills); } // ADDED
    
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push("password_hash = ?"); values.push(hashed);
    }
    
    if (fields.length === 0) return res.status(400).json({ message: "Nothing to update" });
    
    const query = `UPDATE profiles SET ${fields.join(", ")} WHERE email = ?`;
    await db.execute(query, [...values, req.user.email]);
    
    // Fetch and return the updated profile with aliased fields (including skills)
    const [rows] = await db.execute(
      "SELECT email AS id, email, name AS full_name, created_at, department, year, bio, skills FROM profiles WHERE email = ?", 
      [req.user.email]
    );
    res.json(rows[0] || { message: "Profile updated" });

  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ message: "Profile update failed", error: err.message });
  }
});

app.delete("/api/profile", authenticateToken, async (req, res) => {
  try {
    await db.execute("DELETE FROM profiles WHERE email = ?", [req.user.email]);
    res.json({ message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

// SKILLS endpoints
app.post("/api/skills", authenticateToken, async (req, res) => {
  try {
    // FIX: Extract proficiency_level and category as required by frontend
    const { skill_name, proficiency_level } = req.body; 
    
    if (!skill_name) return res.status(400).json({ message: "skill_name required" });
    
    const level = proficiency_level || "Beginner";
    const id = uuidv4(); // Unique ID for the skill entry

    // FIX: Insert level and category into the database
    await db.execute("INSERT INTO skills (id, user_email, skill_name, proficiency_level, category) VALUES (?, ?, ?, ?, ?)", [id, req.user.email, skill_name, level, cat]);
    
    // Return the full Skill object expected by frontend
    res.status(201).json({ 
        id, 
        user_id: req.user.email, // Map email to user_id
        skill_name, 
        proficiency_level: level, 
        category: cat, 
        verified: false, // Assuming default
        created_at: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({ message: "Add skill failed", error: err.message });
  }
});

// server.js (Around line 188)

app.get("/api/skills", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      // FIX: Selecting all 7 columns required by the frontend Skill type
      "SELECT user_email, skill_name, proficiency_level, verified, created_at FROM skills WHERE user_email = ?", 
      [req.user.email]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get skills failed:", err); 
    res.status(500).json({ message: "Get skills failed", error: err.message });
  }
});

app.delete("/api/skills", authenticateToken, async (req, res) => {
  try {
    // FIX: Delete by skill_name received in the request body (as fixed in api.ts)
    const { skill_name } = req.body;
    if (!skill_name) return res.status(400).json({ message: "skill_name required" });
    await db.execute("DELETE FROM skills WHERE user_email = ? AND skill_name = ?", [req.user.email, skill_name]);
    res.json({ message: "Skill deleted", success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete skill failed", error: err.message });
  }
});

// CONNECTIONS endpoints
// FIX: Use simple POST /api/connections for sending request
app.post("/api/connections", authenticateToken, async (req, res) => {
  try {
    const { receiver_email, message } = req.body;
    if (!receiver_email) return res.status(400).json({ message: "receiver_email required" });
    const id = uuidv4();
    await db.execute("INSERT INTO connections (id, requester_email, receiver_email, message) VALUES (?, ?, ?, ?)", [id, req.user.email, receiver_email, message || ""]);
    
    // FIX: Send socket update with frontend-friendly IDs
    const newConn = { 
        id, 
        requester_id: req.user.email, 
        receiver_id: receiver_email, 
        status: 'pending', 
        message: message || "", 
        created_at: new Date().toISOString() 
    };
    
    io.to(receiver_email).emit("connection_request", newConn);
    res.status(201).json(newConn); // Return full Connection object
  } catch (err) {
    res.status(500).json({ message: "Connection request failed", error: err.message });
  }
});

// FIX: Use PATCH /api/connections/:id/accept
app.patch("/api/connections/:id/accept", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id; // Get ID from URL
    if (!id) return res.status(400).json({ message: "id required in URL" });
    
    // Ensure the current user is the receiver
    await db.execute("UPDATE connections SET status = 'accepted' WHERE id = ? AND receiver_email = ?", [id, req.user.email]);
    
    const [rows] = await db.execute("SELECT id, requester_email, receiver_email, status, message, created_at FROM connections WHERE id = ?", [id]);
    
    if (rows.length) {
      const updatedConn = { 
        id: rows[0].id, 
        requester_id: rows[0].requester_email, 
        receiver_id: rows[0].receiver_email, 
        status: rows[0].status, 
        message: rows[0].message, 
        created_at: rows[0].created_at 
      };
      
      io.to(rows[0].requester_email).emit("connection_accepted", updatedConn);
      return res.json(updatedConn);
    }
    res.status(404).json({ message: "Connection not found or not authorized" });
  } catch (err) {
    res.status(500).json({ message: "Accept failed", error: err.message });
  }
});

// FIX: Use PATCH /api/connections/:id/reject
app.patch("/api/connections/:id/reject", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id; // Get ID from URL
    if (!id) return res.status(400).json({ message: "id required in URL" });
    
    // Ensure the current user is the receiver
    await db.execute("UPDATE connections SET status = 'rejected' WHERE id = ? AND receiver_email = ?", [id, req.user.email]);
    
    const [rows] = await db.execute("SELECT id, requester_email, receiver_email, status, message, created_at FROM connections WHERE id = ?", [id]);
    
    if (rows.length) {
      const updatedConn = { 
        id: rows[0].id, 
        requester_id: rows[0].requester_email, 
        receiver_id: rows[0].receiver_email, 
        status: rows[0].status, 
        message: rows[0].message, 
        created_at: rows[0].created_at 
      };
      
      io.to(rows[0].requester_email).emit("connection_rejected", updatedConn);
      return res.json(updatedConn);
    }
    res.status(404).json({ message: "Connection not found or not authorized" });
  } catch (err) {
    res.status(500).json({ message: "Reject failed", error: err.message });
  }
});

app.get("/api/connections", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM connections WHERE requester_email = ? OR receiver_email = ?", [req.user.email, req.user.email]);
    
    // FIX: Map email fields to frontend ID fields
    const connections = rows.map(row => ({
      ...row,
      requester_id: row.requester_email,
      receiver_id: row.receiver_email,
    }));
    
    res.json(connections);
  } catch (err) {
    res.status(500).json({ message: "Get connections failed", error: err.message });
  }
});

// MESSAGES endpoints
app.post("/api/messages", authenticateToken, async (req, res) => {
  try {
    const { receiver_email, content } = req.body;
    if (!receiver_email || !content) return res.status(400).json({ message: "receiver_email & content required" });
    const id = uuidv4();
    await db.execute("INSERT INTO messages (id, sender_email, receiver_email, content) VALUES (?, ?, ?, ?)", [id, req.user.email, receiver_email, content]);
    
    const payload = { 
        id, 
        sender_id: req.user.email, // Map sender_email to sender_id
        receiver_id: receiver_email, // Map receiver_email to receiver_id
        content, 
        read: false, 
        created_at: new Date().toISOString() 
    };
    
    io.to(receiver_email).emit("receive_message", payload);
    res.status(201).json({ message: "Message sent", id });
  } catch (err) {
    res.status(500).json({ message: "Send message failed", error: err.message });
  }
});

app.get("/api/messages/:withEmail", authenticateToken, async (req, res) => {
  try {
    const withEmail = req.params.withEmail;
    const [rows] = await db.execute(
      `SELECT * FROM messages WHERE (sender_email = ? AND receiver_email = ?) OR (sender_email = ? AND receiver_email = ?) ORDER BY created_at ASC`,
      [req.user.email, withEmail, withEmail, req.user.email]
    );
    
    // FIX: Map email fields to frontend ID fields
    const messages = rows.map(row => ({
      ...row,
      sender_id: row.sender_email,
      receiver_id: row.receiver_email,
      read: row.read === 1, // Ensure read is a boolean
    }));
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Get messages failed", error: err.message });
  }
});

// ENDORSEMENTS
app.post("/api/endorsements", authenticateToken, async (req, res) => {
  try {
    const { user_email, skill_name } = req.body;
    if (!user_email || !skill_name) return res.status(400).json({ message: "user_email & skill_name required" });
    
    // Ensure the user is not endorsing themselves
    if (user_email === req.user.email) return res.status(400).json({ message: "Cannot endorse yourself" });

    const id = uuidv4();
    await db.execute("INSERT INTO endorsements (id, user_email, skill_name, endorser_email) VALUES (?, ?, ?, ?)", [id, user_email, skill_name, req.user.email]);
    io.to(user_email).emit("endorsed", { id, skill_name, by: req.user.email });
    res.status(201).json({ message: "Endorsed", id });
  } catch (err) {
    // Handle duplicate endorsement error gracefully (assuming unique constraint on user_email, skill_name, endorser_email)
    res.status(500).json({ message: "Endorse failed", error: err.message });
  }
});

app.get("/api/endorsements/:userEmail", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const [rows] = await db.execute("SELECT * FROM endorsements WHERE user_email = ?", [userEmail]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Get endorsements failed", error: err.message });
  }
});

// SEARCH (Used by frontend as /api/profiles)
app.get("/api/search", authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const wildcard = `%${q}%`;
    
    // Ensure all profile fields are selected for search results
    const [rows] = await db.execute(
      "SELECT email AS id, email, name AS full_name, department, year, bio, skills FROM profiles WHERE (name LIKE ? OR email LIKE ?) AND email != ? LIMIT 50", 
      [wildcard, wildcard, req.user.email]
    );
    res.json(rows);
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

// SOCKET.IO AUTHENTICATION & REAL-TIME
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || (socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(" ")[1]);
    if (!token) return next(new Error("Authentication token missing"));
    const payload = await verifyJwt(token);
    socket.user = payload; // Attach user info to the socket
    return next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    return next(new Error("Authentication error"));
  }
});

const online = new Map();

io.on("connection", (socket) => {
  const email = socket.user.email;
  console.log(`Socket connected: ${socket.id} for ${email}`);

  const set = online.get(email) || new Set();
  set.add(socket.id);
  online.set(email, set);

  socket.join(email); // Join a room named after the user's email

  io.emit("presence_update", { user: email, online: true });

  socket.on("send_message", async (data, ack) => {
    try {
      if (!data?.to || !data?.content) return ack && ack({ status: "error", message: "to & content required" });
      const id = uuidv4();
      
      // Ensure 'to' exists in the database before inserting message (optional, but good practice)
      // const [receiverRows] = await db.execute("SELECT email FROM profiles WHERE email = ?", [data.to]);
      // if (!receiverRows.length) return ack && ack({ status: "error", message: "Receiver not found" });

      await db.execute("INSERT INTO messages (id, sender_email, receiver_email, content) VALUES (?, ?, ?, ?)", [id, email, data.to, data.content]);
      
      const payload = { 
        id, 
        sender_id: email, 
        receiver_id: data.to, 
        content: data.content, 
        read: false, 
        created_at: new Date().toISOString() 
      };
      
      // Send to receiver's room and sender's room
      io.to(data.to).emit("receive_message", payload);
      io.to(email).emit("message_sent", payload); 
      
      ack && ack({ status: "ok", id });
    } catch (err) {
      console.error("Socket send_message error:", err.message);
      ack && ack({ status: "error", message: err.message });
    }
  });

  socket.on("disconnect", () => {
    const s = online.get(email);
    if (s) {
      s.delete(socket.id);
      if (s.size === 0) {
        online.delete(email);
        io.emit("presence_update", { user: email, online: false });
      } else online.set(email, s);
    }
    console.log(`Socket disconnected: ${socket.id} for ${email}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
