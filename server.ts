import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";
import 'dotenv/config';

// Email transporter configuration
const getEmailTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP_USER or SMTP_PASS is missing in environment variables.");
    return null;
  }
  
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  
  console.log(`Configuring email transporter with host: ${host}, port: ${port}, user: ${process.env.SMTP_USER}`);
  
  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // Use SSL for port 465, STARTTLS for others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Helps with some hosting environments
    },
    debug: true,
    logger: true
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "data.json");
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
  }

  const DEFAULT_DATA = {
    settings: {
      clubName: "IRB Warriors",
      established: "2026",
      location: "Abdul Rob Bazar, Islam Gonj, Kamal Nagar, Lakshmipur",
      phone: "+880 1892-128292",
      whatsapp: "+880 1892-128292",
      facebook: "https://www.facebook.com/share/1DzscJ3sCS/",
      logo: "/logo.png",
      admissionFee: 0,
      monthlyFee: 0
    },
    committee: [],
    players: [],
    matches: [],
    admissions: [],
    finance: [],
    notices: [],
    gallery: [],
    events: [],
    hostedTournaments: [],
    externalTournaments: []
  };

  // Initialize data file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  } else {
    try {
      const existingData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      let updated = false;
      (Object.keys(DEFAULT_DATA) as Array<keyof typeof DEFAULT_DATA>).forEach(key => {
        if (!existingData[key]) {
          existingData[key] = DEFAULT_DATA[key as keyof typeof DEFAULT_DATA];
          updated = true;
        }
      });
      if (updated) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
      }
    } catch (e) {
      console.error("Error updating data file:", e);
    }
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Multer configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  // Upload endpoint
  app.post("/api/upload", upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // API Routes
  app.get("/api/data", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json(data);
  });

  // Email Notification Endpoint
  app.post("/api/send-email", async (req, res) => {
    const { subject, text, html } = req.body;
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      console.warn("Email requested but SMTP credentials are not configured in .env");
      return res.status(500).json({ error: "SMTP credentials not configured" });
    }

    try {
      console.log(`Attempting to send email to: ${process.env.ADMIN_EMAIL || process.env.SMTP_USER}`);
      const info = await transporter.sendMail({
        from: `"IRB Warriors Portal" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        subject: subject,
        text: text,
        html: html,
      });
      console.log("Email sent successfully:", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("--- EMAIL SENDING ERROR ---");
      console.error("Error Message:", error.message);
      console.error("Error Code:", error.code);
      console.error("Command:", error.command);
      
      if (error.message.includes("Invalid login") || error.message.includes("auth")) {
        console.error("HINT: SMTP login failed. If using Gmail, make sure you are using an 'App Password', not your regular password.");
      }
      
      res.status(500).json({ 
        error: "Failed to send email", 
        message: error.message,
        code: error.code 
      });
    }
  });

  // Settings
  app.post("/api/settings", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.settings = { ...data.settings, ...req.body };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(data.settings);
  });

  // Admissions
  app.post("/api/admissions", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newAdmission = { ...req.body, id: Date.now(), status: "pending" };
    data.admissions.push(newAdmission);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newAdmission);
  });

  app.post("/api/admissions/:id/approve", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const admissionIdx = data.admissions.findIndex((a: any) => a.id === parseInt(req.params.id));
    if (admissionIdx !== -1) {
      const admission = data.admissions[admissionIdx];
      admission.status = "approved";
      
      // Auto-create player from approved admission
      const newPlayer = {
        id: Date.now(),
        name: admission.name || "Unknown",
        fatherName: admission.fatherName || "",
        dob: admission.dob || "",
        bloodGroup: admission.bloodGroup || "",
        address: admission.address || "",
        role: admission.role || "Batsman",
        battingStyle: admission.battingStyle || "Right Hand",
        bowlingStyle: admission.bowlingStyle || "",
        jerseySize: admission.jerseySize || "M",
        jerseyNumber: admission.jerseyNumber && admission.jerseyNumber.trim() !== "" ? admission.jerseyNumber : "TBD",
        photo: admission.photo && admission.photo.trim() !== "" ? admission.photo : "https://picsum.photos/seed/new/200/200",
        phone: admission.phone || "",
        status: "Active",
        monthlyFee: data.settings.monthlyFee || 0,
        stats: { 
          matches: 0, 
          runs: 0, 
          wickets: 0, 
          avg: 0, 
          sr: 0,
          fours: 0,
          sixes: 0,
          fifties: 0,
          hundreds: 0,
          bowlInnings: 0,
          overs: 0,
          runsConceded: 0,
          bestBowling: "N/A",
          economy: 0,
          bowlSr: 0,
          maidens: 0,
          bestInnings: "N/A"
        },
        tournamentStats: [],
        lastMatches: [],
        matchHistory: []
      };
      
      data.players.push(newPlayer);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(admission);
    } else {
      res.status(404).send("Not found");
    }
  });

  app.delete("/api/admissions/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.admissions = data.admissions.filter((a: any) => a.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.post("/api/admissions/:id/payment", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const admission = data.admissions.find((a: any) => a.id === parseInt(req.params.id));
    if (admission) {
      const oldAmountPaid = admission.amountPaid || 0;
      const newAmountPaid = req.body.amountPaid || 0;
      const difference = newAmountPaid - oldAmountPaid;

      admission.amountPaid = newAmountPaid;
      admission.paymentStatus = req.body.paymentStatus;

      if (difference > 0) {
        data.finances.push({
          id: Date.now(),
          type: "Income",
          amount: difference,
          category: "Admission Fee",
          description: `Admission Payment from ${admission.name}`,
          date: new Date().toISOString().split('T')[0]
        });
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(admission);
    } else {
      res.status(404).send("Not found");
    }
  });

  // Committee
  app.post("/api/committee", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newMember = { ...req.body, id: Date.now() };
    data.committee.push(newMember);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newMember);
  });

  // Players
  app.post("/api/players", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newPlayer = { ...req.body, id: Date.now() };
    data.players.push(newPlayer);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newPlayer);
  });

  app.post("/api/players/:id/stats", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const player = data.players.find((p: any) => p.id === parseInt(req.params.id));
    if (player) {
      player.stats = { ...player.stats, ...req.body };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(player);
    } else {
      res.status(404).send("Not found");
    }
  });

  app.delete("/api/players/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.players = data.players.filter((p: any) => p.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  // Finance
  app.post("/api/finance", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newRecord = { ...req.body, id: Date.now() };
    data.finance.push(newRecord);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newRecord);
  });

  app.delete("/api/finance/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.finance = data.finance.filter((f: any) => f.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  // Notices
  app.post("/api/notices", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newNotice = { ...req.body, id: Date.now() };
    data.notices.push(newNotice);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newNotice);
  });

  // Gallery
  app.post("/api/gallery", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newItem = { ...req.body, id: Date.now() };
    data.gallery.push(newItem);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newItem);
  });

  app.delete("/api/gallery/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.gallery = data.gallery.filter((item: any) => item.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  // Events
  app.post("/api/events", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newEvent = { ...req.body, id: Date.now() };
    data.events.push(newEvent);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newEvent);
  });

  app.delete("/api/events/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.events = data.events.filter((e: any) => e.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  // Hosted Tournaments
  app.post("/api/hostedTournaments", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newTournament = { ...req.body, id: Date.now(), registrations: [], sponsors: [], fixtures: [] };
    data.hostedTournaments.push(newTournament);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newTournament);
  });

  app.delete("/api/hostedTournaments/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.hostedTournaments = data.hostedTournaments.filter((t: any) => t.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.patch("/api/hostedTournaments/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournamentIdx = data.hostedTournaments.findIndex((t: any) => t.id === parseInt(req.params.id));
    if (tournamentIdx !== -1) {
      data.hostedTournaments[tournamentIdx] = { ...data.hostedTournaments[tournamentIdx], ...req.body };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(data.hostedTournaments[tournamentIdx]);
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  app.post("/api/hostedTournaments/:id/registrations", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournament = data.hostedTournaments.find((t: any) => t.id === parseInt(req.params.id));
    if (tournament) {
      const newReg = { ...req.body, id: Date.now(), registrationDate: new Date().toISOString() };
      tournament.registrations.push(newReg);

      if (newReg.amountPaid && newReg.amountPaid > 0) {
        data.finances.push({
          id: Date.now() + 1,
          type: "Income",
          amount: newReg.amountPaid,
          category: "Tournament Fee",
          description: `Initial payment from ${newReg.teamName} for ${tournament.name}`,
          date: new Date().toISOString().split('T')[0]
        });
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(newReg);
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  app.post("/api/hostedTournaments/:id/registrations/:regId/payment", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournament = data.hostedTournaments.find((t: any) => t.id === parseInt(req.params.id));
    if (tournament) {
      const reg = tournament.registrations.find((r: any) => r.id === parseInt(req.params.regId));
      if (reg) {
        const oldAmountPaid = reg.amountPaid || 0;
        const newAmountPaid = req.body.amountPaid || 0;
        const difference = newAmountPaid - oldAmountPaid;

        reg.amountPaid = newAmountPaid;
        reg.amountDue = req.body.amountDue;
        reg.paymentStatus = req.body.paymentStatus;

        if (difference > 0) {
          data.finances.push({
            id: Date.now(),
            type: "Income",
            amount: difference,
            category: "Tournament Fee",
            description: `Payment from ${reg.teamName} for ${tournament.name}`,
            date: new Date().toISOString().split('T')[0]
          });
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(reg);
      } else {
        res.status(404).send("Registration not found");
      }
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  app.post("/api/hostedTournaments/:id/sponsors", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournament = data.hostedTournaments.find((t: any) => t.id === parseInt(req.params.id));
    if (tournament) {
      const newSponsor = { ...req.body, id: Date.now() };
      tournament.sponsors.push(newSponsor);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(newSponsor);
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  app.post("/api/hostedTournaments/:id/fixtures", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournament = data.hostedTournaments.find((t: any) => t.id === parseInt(req.params.id));
    if (tournament) {
      const newMatch = { ...req.body, id: Date.now(), status: "Upcoming" };
      tournament.fixtures.push(newMatch);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(newMatch);
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  app.post("/api/hostedTournaments/:id/fixtures/:matchId/score", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournament = data.hostedTournaments.find((t: any) => t.id === parseInt(req.params.id));
    if (tournament) {
      const match = tournament.fixtures.find((m: any) => m.id === parseInt(req.params.matchId));
      if (match) {
        match.score = req.body.score;
        match.status = req.body.status || "Live";
        if (req.body.result) match.result = req.body.result;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(match);
      } else {
        res.status(404).send("Match not found");
      }
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  // External Tournaments
  app.post("/api/externalTournaments", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newTournament = { ...req.body, id: Date.now(), expenses: [], matches: [] };
    data.externalTournaments.push(newTournament);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newTournament);
  });

  app.delete("/api/externalTournaments/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.externalTournaments = data.externalTournaments.filter((t: any) => t.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.post("/api/externalTournaments/:id/expenses", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const tournament = data.externalTournaments.find((t: any) => t.id === parseInt(req.params.id));
    if (tournament) {
      const newExpense = { ...req.body, id: Date.now() };
      tournament.expenses.push(newExpense);
      // Also add to main finance
      data.finance.push({ ...newExpense, description: `[${tournament.name}] ${newExpense.description}` });
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(newExpense);
    } else {
      res.status(404).send("Tournament not found");
    }
  });

  // Committee Delete
  app.delete("/api/committee/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.committee = data.committee.filter((m: any) => m.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  // Matches & Scoring
  app.post("/api/matches", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newMatch = { ...req.body, id: Date.now() };
    data.matches.push(newMatch);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newMatch);
  });

  app.delete("/api/matches/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.matches = data.matches.filter((m: any) => m.id !== parseInt(req.params.id));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.post("/api/matches/:id/score", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const match = data.matches.find((m: any) => m.id === parseInt(req.params.id));
    if (match) {
      match.score = req.body;
      match.status = "Live";
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json(match);
    } else {
      res.status(404).send("Not found");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
