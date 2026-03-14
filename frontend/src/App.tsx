import { useState, useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { LiveTrips } from "./pages/LiveTrips";
import { Drivers } from "./pages/Drivers";
import { Riders } from "./pages/Riders";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Settings } from "./pages/Settings";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ArchiveTrips } from "./pages/ArchiveTrips";
import { VerificationBadges } from "./pages/VerificationBadges";
import { Reservations } from "./pages/Reservations";
import { RideAssignment } from "./pages/RideAssignment";
import { DeliveryServices } from "./pages/DeliveryServices"; // Added import
import { DriverDocuments } from "./pages/DriverDocuments";
import { RentalCompanies } from "./pages/RentalCompanies";
import { Payment } from "./pages/Payment";
import { Support } from "./pages/Support";
import { ReviewManagement } from "./pages/ReviewManagement";
import { Coupons } from "./pages/Coupons";
import { Notifications } from "./pages/Notifications";
import { Reports } from "./pages/Reports";
import { AllServices } from "./pages/AllServices";
import { Profile } from "./pages/Profile";
import "./index.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("token");
  });
  const [authView, setAuthView] = useState<"login" | "forgot-password">(
    "login",
  );
  const [currentPage, setCurrentPage] = useState(() => {
    // Check URL hash first, then localStorage, then default to dashboard
    const hash = window.location.hash.replace("#", "");
    if (hash) return hash;
    return localStorage.getItem("currentPage") || "dashboard";
  });

  // Persist page to localStorage and URL hash on change
  useEffect(() => {
    localStorage.setItem("currentPage", currentPage);
    window.location.hash = currentPage;
  }, [currentPage]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && hash !== currentPage) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentPage]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setAuthView("login");
      setCurrentPage("dashboard");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} />;
      case "live-trips":
        return <LiveTrips />;
      case "archive-trips":
        return <ArchiveTrips />;
      case "verification-badges":
        return <VerificationBadges />;
      case "reservation":
        return <Reservations />;
      case "ride-assignment":
        return <RideAssignment />;
      case "delivery-services": // Added route
        return <DeliveryServices />;
      case "drivers":
        return <Drivers />;
      case "riders":
        return <Riders />;
      case "driver-documents":
        return <DriverDocuments />;
      case "rental-companies":
        return <RentalCompanies />;
      case "payment":
        return <Payment />;
      case "support":
        return <Support />;
      case "review-management":
        return <ReviewManagement />;
      case "coupons":
        return <Coupons />;
      case "notifications":
        return <Notifications />;
      case "report":
        return <Reports />;
      case "settings":
        return <Settings />;
      case "all-services":
        return <AllServices />;
      case "profile":
        return (
          <Profile
            onLogout={async () => {
              try {
                const { profileLogoutApi } = await import("./services/api");
                await profileLogoutApi();
              } catch {
                // Logout locally even if API fails
              }
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setIsAuthenticated(false);
              setAuthView("login");
            }}
          />
        );
      default:
        return (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Page Under Construction</h2>
            <p>The {currentPage} page is coming soon.</p>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    if (authView === "login") {
      return (
        <Login
          onLogin={() => setIsAuthenticated(true)}
          onForgotPassword={() => setAuthView("forgot-password")}
        />
      );
    } else {
      return <ForgotPassword onBackToLogin={() => setAuthView("login")} />;
    }
  }

  return (
    <div className="dashboard-grid">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <Sidebar
        activePage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="main-content">
        <Header
          onLogout={async () => {
            try {
              const { profileLogoutApi } = await import("./services/api");
              await profileLogoutApi();
            } catch {
              // Logout locally even if API fails
            }
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setIsAuthenticated(false);
            setAuthView("login");
          }}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={setCurrentPage}
        />
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
