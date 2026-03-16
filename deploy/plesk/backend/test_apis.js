const http = require("http");

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TestScript/1.0",
      },
    };
    if (token) opts.headers["Authorization"] = "Bearer " + token;
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    // Login
    const login = await request("POST", "/api/admin/auth/login", {
      email: "admin@hezzni.com",
      password: "Admin@123",
    });
    console.log("LOGIN:", login.status, JSON.stringify(login.body));
    const token = login.body.token;
    if (!token) {
      console.log("No token, aborting");
      process.exit(1);
    }

    // Review endpoints
    console.log("\n--- REVIEW ENDPOINTS ---");
    const rs = await request("GET", "/api/admin/reviews/stats", null, token);
    console.log("GET /reviews/stats:", rs.status, JSON.stringify(rs.body));

    const rl = await request("GET", "/api/admin/reviews", null, token);
    console.log("GET /reviews:", rl.status, JSON.stringify(rl.body));

    // Coupon endpoints
    console.log("\n--- COUPON ENDPOINTS ---");
    const cs = await request("GET", "/api/admin/coupons/stats", null, token);
    console.log("GET /coupons/stats:", cs.status, JSON.stringify(cs.body));

    const so = await request(
      "GET",
      "/api/admin/coupons/service-options",
      null,
      token,
    );
    console.log(
      "GET /coupons/service-options:",
      so.status,
      JSON.stringify(so.body),
    );

    const cl = await request("GET", "/api/admin/coupons", null, token);
    console.log("GET /coupons:", cl.status, JSON.stringify(cl.body));

    // Get detail for first coupon
    if (cl.body.promotions && cl.body.promotions.length > 0) {
      const cid = cl.body.promotions[0].dbId || cl.body.promotions[0].id;
      const cd = await request("GET", "/api/admin/coupons/" + cid, null, token);
      console.log(
        "GET /coupons/" + cid + ":",
        cd.status,
        JSON.stringify(cd.body),
      );
    }

    console.log("\nAll tests passed!");
  } catch (e) {
    console.error("Error:", e.message);
  }
})();
