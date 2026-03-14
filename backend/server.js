const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes (Placeholder)
app.use("/api/admin/auth", require("./routes/authRoutes"));
app.use("/api/admin/user", require("./routes/adminUserRoutes"));
app.use("/api/admin/settings", require("./routes/adminSettingsRoutes"));
app.use("/api/admin/team", require("./routes/adminTeamRoutes"));
app.use("/api/admin/profile", require("./routes/profileRoutes"));
app.use("/api/admin/dashboard", require("./routes/adminDashboardRoutes"));
app.use("/api/admin/trips", require("./routes/tripRoutes"));
app.use("/api/admin/filters", require("./routes/filterRoutes"));
app.use("/api/admin/archive", require("./routes/archiveRoutes"));
app.use("/api/admin/verification", require("./routes/verificationRoutes"));
app.use("/api/admin/ride-assignment", require("./routes/rideAssignmentRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/riders", require("./routes/riderRoutes"));
app.use("/api/passenger", require("./routes/passengerRoutes"));
app.use("/api/driver", require("./routes/driverUserRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/admin/reservations", require("./routes/reservationRoutes"));
app.use("/api/admin/delivery", require("./routes/deliveryRoutes"));
app.use("/api/admin/driver", require("./routes/adminDriverRoutes"));
app.use("/api/admin/rider", require("./routes/adminRiderRoutes"));
app.use(
  "/api/admin/driver-documents",
  require("./routes/adminDriverDocumentsRoutes"),
);
app.use(
  "/api/admin/rental-companies",
  require("./routes/adminRentalCompaniesRoutes"),
);
app.use("/api/admin/reviews", require("./routes/adminReviewRoutes"));
app.use("/api/admin/coupons", require("./routes/adminCouponRoutes"));
app.use(
  "/api/admin/notifications",
  require("./routes/adminNotificationRoutes"),
);
app.use("/api/admin/reports", require("./routes/adminReportRoutes"));
app.use(
  "/api/admin/service-management",
  require("./routes/adminServiceManagementRoutes"),
);

const passengerController = require("./controllers/passengerController");

app.get("/api/cities", passengerController.getCities);

const http = require("http");
const initRideSocket = require("./sockets/rideSocket");

const server = http.createServer(app);

// Initialize Ride Socket
initRideSocket(server);

// Basic Route for testing
app.get("/", (req, res) => {
  res.send("Hezzni Admin API is running");
});

// Database Connection Test
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await db.pool.execute("SELECT NOW()");
    res.json(result[0][0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database connection error");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Another backend instance is already running or the port is occupied.`,
    );
    console.error(
      `Stop the existing process or set a different PORT in backend/.env before starting again.`,
    );
    process.exit(1);
  }

  throw err;
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
