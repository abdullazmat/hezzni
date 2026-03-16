import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowUpRight,
  Search,
  CheckCircle2,
  Filter,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { UserAvatar } from "../../components/UserAvatar";
import {
  TeamMember,
  TeamStats,
  extractArrayPayload,
  getTeamMembersApi,
  getTeamStatsApi,
  addTeamMemberApi,
  resolveApiAssetUrl,
  resolveApiUrl,
  unwrapApiPayload,
  updateTeamMemberApi,
  deleteTeamMemberApi,
} from "../../services/api";

// Specialized Icons
import activeDriversIcon from "../../assets/icons/Active Drivers.png";
import waitingCustomersIcon from "../../assets/icons/Waiting Customers.png";
import completedIcon from "../../assets/icons/completed.png";
const TEAM_MEMBER_KEYS = [
  "members",
  "teamMembers",
  "items",
  "rows",
  "list",
  "results",
  "data",
];

const FALLBACK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: "Amina B.",
    email: "amina.operations@ezzni.com",
    role: "Super Admin",
    status: "Available",
    avatar: null,
    department: "Operations",
    job_title: "Operations Lead",
    city: "Casablanca",
    employee_id: "EMP-201",
    last_login: new Date().toISOString(),
    last_logout: null,
  },
  {
    id: 2,
    name: "Karim R.",
    email: "karim.support@ezzni.com",
    role: "Admin",
    status: "Available",
    avatar: null,
    department: "Support",
    job_title: "Support Supervisor",
    city: "Rabat",
    employee_id: "EMP-202",
    last_login: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    last_logout: null,
  },
  {
    id: 3,
    name: "Salma M.",
    email: "salma.marketing@ezzni.com",
    role: "Manager",
    status: "Inactive",
    avatar: null,
    department: "Marketing",
    job_title: "Campaign Manager",
    city: "Marrakech",
    employee_id: "EMP-203",
    last_login: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    last_logout: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

const FALLBACK_TEAM_STATS: TeamStats = {
  totalMembers: FALLBACK_TEAM_MEMBERS.length,
  active: FALLBACK_TEAM_MEMBERS.filter(
    (member) => member.status === "Available",
  ).length,
  admins: FALLBACK_TEAM_MEMBERS.filter(
    (member) => member.role === "Super Admin",
  ).length,
  onlineToday: 2,
};

function deriveStatsFromMembers(nextMembers: TeamMember[]): TeamStats {
  const totalMembers = nextMembers.length;
  const active = nextMembers.filter(
    (member) => member.status === "Available",
  ).length;
  const admins = nextMembers.filter((member) =>
    member.role.toLowerCase().includes("admin"),
  ).length;

  return {
    totalMembers,
    active,
    admins,
    onlineToday: active,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTeamMember(value: unknown): TeamMember {
  const member = (value ?? {}) as Partial<TeamMember> & Record<string, unknown>;
  const statusValue =
    typeof member.status === "string" ? member.status.toLowerCase() : "";

  return {
    id: Number(member.id ?? 0),
    name:
      typeof member.name === "string" && member.name.trim()
        ? member.name.trim()
        : "Unknown Member",
    email: typeof member.email === "string" ? member.email.trim() : "",
    role:
      typeof member.role === "string" && member.role.trim()
        ? member.role.trim()
        : "Admin",
    status:
      statusValue === "available" ||
      statusValue === "active" ||
      statusValue === "online"
        ? "Available"
        : "Inactive",
    avatar: normalizeOptionalString(member.avatar),
    department: normalizeOptionalString(member.department),
    job_title: normalizeOptionalString(member.job_title),
    city: normalizeOptionalString(member.city),
    employee_id: normalizeOptionalString(member.employee_id),
    last_login: normalizeOptionalString(member.last_login),
    last_logout: normalizeOptionalString(member.last_logout),
  };
}

function normalizeTeamStats(value: unknown): TeamStats {
  const stats = (unwrapApiPayload<Record<string, unknown>>(value) ??
    {}) as Record<string, unknown>;

  return {
    totalMembers: Number(stats.totalMembers ?? 0),
    active: Number(stats.active ?? 0),
    admins: Number(stats.admins ?? 0),
    onlineToday: Number(stats.onlineToday ?? 0),
  };
}

function getAvatarSrc(avatar: string | null | undefined): string {
  const avatarPath = avatar?.trim();

  if (!avatarPath) {
    return "";
  }

  if (
    avatarPath.startsWith("http://") ||
    avatarPath.startsWith("https://") ||
    avatarPath.startsWith("data:")
  ) {
    return avatarPath;
  }

  if (avatarPath.startsWith("/uploads/") || avatarPath.startsWith("uploads/")) {
    return resolveApiAssetUrl(avatarPath);
  }

  const uploadsIndex = avatarPath.indexOf("uploads/");
  if (uploadsIndex >= 0) {
    return resolveApiUrl(avatarPath.slice(uploadsIndex));
  }

  if (avatarPath.startsWith("/")) {
    return resolveApiUrl(avatarPath);
  }

  return resolveApiUrl(`/uploads/avatars/${avatarPath}`);
}

function formatLastSeen(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export const TeamManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Total Members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats>({
    totalMembers: 0,
    active: 0,
    admins: 0,
    onlineToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("view");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    employeeId: "",
    role: "Admin",
    status: "Available",
    department: "Operations",
    jobTitle: "",
    city: "",
    message: "Welcome to the team!",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, statsRes] = await Promise.all([
        getTeamMembersApi(),
        getTeamStatsApi(),
      ]);

      let resolvedMembers = FALLBACK_TEAM_MEMBERS;

      if (membersRes.ok) {
        const nextMembers = extractArrayPayload(
          membersRes.data,
          TEAM_MEMBER_KEYS,
        )
          .map(normalizeTeamMember)
          .filter((member) => member.id > 0);
        resolvedMembers =
          nextMembers.length > 0 ? nextMembers : FALLBACK_TEAM_MEMBERS;
        setMembers(resolvedMembers);
      } else {
        setMembers(FALLBACK_TEAM_MEMBERS);
      }

      if (statsRes.ok) {
        const nextStats = normalizeTeamStats(statsRes.data);
        setStats(
          nextStats.totalMembers > 0 ||
            nextStats.active > 0 ||
            nextStats.admins > 0 ||
            nextStats.onlineToday > 0
            ? nextStats
            : deriveStatsFromMembers(resolvedMembers),
        );
      } else {
        setStats(deriveStatsFromMembers(resolvedMembers));
      }
    } catch (err) {
      console.error("Failed to fetch team data", err);
      setMembers(FALLBACK_TEAM_MEMBERS);
      setStats(FALLBACK_TEAM_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dynamicStats = [
    {
      label: "Total Members",
      value: stats.totalMembers.toString().padStart(2, "0"),
      color: "#ffffff",
      textColor: "#111827",
      icon: activeDriversIcon,
    },
    {
      label: "Active",
      value: stats.active.toString().padStart(2, "0"),
      color: "#38AC57",
      textColor: "#ffffff",
      icon: completedIcon,
    },
    {
      label: "Admins",
      value: stats.admins.toString().padStart(2, "0"),
      color: "#ffffff",
      textColor: "#111827",
      icon: waitingCustomersIcon,
    },
    {
      label: "Online Today",
      value: stats.onlineToday.toString().padStart(2, "0"),
      color: "#ffffff",
      textColor: "#111827",
      icon: activeDriversIcon,
    },
  ];

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeFilter === "Active")
      return matchesSearch && member.status === "Available";
    if (activeFilter === "Admins")
      return matchesSearch && member.role === "Super Admin";
    if (activeFilter === "Online Today") return matchesSearch;
    return matchesSearch;
  });

  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleAddClick = () => {
    setModalError(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      employeeId: "",
      role: "Admin",
      status: "Available",
      department: "Operations",
      jobTitle: "",
      city: "",
      message: "Welcome to the team!",
    });
    setModalMode("add");
    setIsModalOpen(true);
  };

  const handleEditClick = (member: TeamMember) => {
    setModalError(null);
    setSelectedMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: "",
      employeeId: member.employee_id || "",
      role: member.role,
      status: member.status,
      department: member.department || "",
      jobTitle: member.job_title || "",
      city: member.city || "",
      message: "",
    });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleViewClick = (member: TeamMember) => {
    setModalError(null);
    setSelectedMember(member);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    let success = false;
    try {
      if (modalMode === "add") {
        const res = await addTeamMemberApi({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          employeeId: formData.employeeId || undefined,
          message: formData.message || undefined,
          role: formData.role,
          department: formData.department,
          jobTitle: formData.jobTitle,
          city: formData.city,
        });
        if (res.ok) {
          setLastAction(`Added new member: ${formData.name}`);
          await fetchData();
          setSearchTerm("");
          setActiveFilter("Total Members");
          success = true;
        } else {
          const errorMessage =
            (res.data as any).message || "Failed to add member";
          setLastAction(errorMessage);
          setModalError(errorMessage);
        }
      } else if (modalMode === "edit" && selectedMember) {
        const res = await updateTeamMemberApi(selectedMember.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status === "Available" ? "Active" : "Inactive",
          department: formData.department,
          jobTitle: formData.jobTitle,
          city: formData.city,
        });
        if (res.ok) {
          setLastAction(`Updated member: ${formData.name}`);
          await fetchData();
          success = true;
        } else {
          const errorMessage =
            (res.data as any).message || "Failed to update member";
          setLastAction(errorMessage);
          setModalError(errorMessage);
        }
      }
    } catch (err) {
      console.error("Save failed", err);
      setLastAction("Operation failed");
      setModalError("Operation failed. Please try again.");
    } finally {
      setSaving(false);
      if (success) {
        setModalError(null);
        setIsModalOpen(false);
      }
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const res = await deleteTeamMemberApi(id);
        if (res.ok) {
          setLastAction(`Deleted member: ${name}`);
          await fetchData();
        } else {
          setLastAction((res.data as any).message || "Failed to delete member");
        }
      } catch (err) {
        console.error("Delete failed", err);
        setLastAction("Delete failed");
      }
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <div style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
          Loading team data...
        </div>
      </div>
    );
  }

  return (
    <div className="vp-team-container">
      <style>{`
        .vp-team-container {
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
            animation: fadeIn 0.4s ease-out;
        }

        .vp-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .vp-stat-card {
            background: white;
            padding: 2rem;
            border-radius: 32px;
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .vp-stat-card.active {
            background: #38AC57;
            border-color: #38AC57;
            box-shadow: 0 20px 25px -5px rgba(56, 172, 87, 0.2);
            color: white;
        }

        .vp-stat-card:hover:not(.active) {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            border-color: #38AC57;
        }

        .vp-stat-icon-box {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f0fdf4;
            transition: all 0.3s;
        }

        .vp-stat-card.active .vp-stat-icon-box {
            background: rgba(255, 255, 255, 0.2);
        }

        .vp-stat-main .label {
            display: block;
            font-size: 1rem;
            font-weight: 800;
            color: #64748b;
            margin-bottom: 0.25rem;
            transition: all 0.3s;
        }

        .vp-stat-card.active .label {
            color: rgba(255, 255, 255, 0.9);
        }

        .vp-stat-value {
            font-size: 2.5rem;
            font-weight: 900;
            letter-spacing: -0.025em;
        }

        .vp-trend-indicator {
            position: absolute;
            right: 2rem;
            bottom: 2rem;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #64748b;
            transition: all 0.3s;
        }

        .vp-stat-card.active .vp-trend-indicator {
            background: rgba(0, 0, 0, 0.15);
            color: white;
        }

        .vp-controls-bar {
            display: grid;
            grid-template-columns: minmax(320px, 1fr) auto;
            grid-template-areas:
              "search search"
              "filters add";
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 3rem;
        }

        .vp-search-box {
            position: relative;
            grid-area: search;
            min-width: 0;
            width: 100%;
        }

        .vp-search-box input {
            width: 100%;
            padding: 0.875rem 1.5rem 0.875rem 3.5rem;
            border-radius: 100px;
            border: 1px solid #e2e8f0;
            font-size: 0.95rem;
            font-weight: 600;
            outline: none;
            transition: all 0.2s;
        }

        .vp-search-box input:focus {
            border-color: #38AC57;
            box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
        }

        .vp-filter-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            grid-area: filters;
            min-width: 0;
          align-items: center;
        }

        .vp-filter-btn {
            background: white;
            border: 1px solid #e2e8f0;
            padding: 0.75rem 1.5rem;
            border-radius: 100px;
            font-weight: 700;
            font-size: 0.9rem;
            color: #475569;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.625rem;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
        }

        .vp-filter-btn:hover {
            border-color: #38AC57;
            color: #38AC57;
        }

        .vp-add-btn {
            background: #38AC57;
            color: white;
            border: none;
            padding: 0.875rem 2rem;
            border-radius: 100px;
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: all 0.3s;
            box-shadow: 0 10px 15px -3px rgba(56, 172, 87, 0.2);
            grid-area: add;
            justify-self: end;
            align-self: center;
            flex-shrink: 0;
        }

        .vp-add-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(56, 172, 87, 0.3);
        }

        .vp-table-card {
            background: white;
            border-radius: 32px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }

        .vp-table-header {
            padding: 2.5rem;
            border-bottom: 1px solid #f1f5f9;
        }

        .vp-table-header h3 {
            font-size: 1.5rem;
            font-weight: 900;
            margin: 0;
            color: #1e293b;
        }

        .vp-table-header p {
            color: #64748b;
            font-size: 1rem;
            margin: 0.5rem 0 0 0;
            font-weight: 500;
        }

        .vp-table-scroll {
            overflow-x: auto;
        }

        .vp-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1000px;
        }

        .vp-table th {
            background: #f8fafc;
            padding: 1.25rem 2.5rem;
            text-align: left;
            font-size: 0.875rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e2e8f0;
        }

        .vp-table td {
            padding: 1.5rem 2.5rem;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .vp-member-cell {
            display: flex;
            align-items: center;
            gap: 1.25rem;
        }

        .vp-member-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #f0fdf4;
        }

        .vp-member-info .name {
            display: block;
            font-weight: 800;
            font-size: 1.05rem;
            color: #1e293b;
        }

        .vp-member-info .email {
            display: block;
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 600;
        }

        .vp-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1.25rem;
            border-radius: 100px;
            font-size: 0.85rem;
            font-weight: 800;
        }

        .vp-badge.dept {
            background: #fef2f2;
            color: #ef4444;
        }

        .vp-badge.status-active {
            background: #f0fdf4;
            color: #38AC57;
        }

        .vp-badge.status-pending {
            background: #fff7ed;
            color: #c2410c;
        }

        .vp-last-login {
            background: #f8fafc;
            padding: 0.5rem 1.25rem;
            border-radius: 100px;
            font-size: 0.85rem;
            font-weight: 700;
            color: #1e293b;
            border: 1px solid #e2e8f0;
            white-space: nowrap;
            display: inline-block;
            width: max-content;
        }

        .vp-action-btn-group {
            display: flex;
            gap: 0.75rem;
        }

        @media (max-width: 1280px) {
          .vp-controls-bar {
            grid-template-columns: 1fr;
            grid-template-areas:
              "search"
              "filters"
              "add";
            gap: 1rem;
          }
          .vp-add-btn {
            justify-self: stretch;
            justify-content: center;
            width: 100%;
          }
          .vp-filter-group {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.35rem;
            scrollbar-width: none;
          }
          .vp-filter-group::-webkit-scrollbar {
            display: none;
          }
        }

        @media (max-width: 768px) {
            .vp-controls-bar {
                gap: 1.25rem;
            }
            .vp-search-box {
                width: 100%;
            }
            .vp-filter-group {
                justify-content: flex-start;
                padding-bottom: 0.5rem;
            }
            .vp-add-btn {
                width: 100%;
                justify-content: center;
            }
            .vp-table-header {
                padding: 1.5rem;
                text-align: center;
            }
        }

        .vp-team-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 1.5rem;
        }

        .vp-team-modal {
            background: white;
            border-radius: 32px;
            width: 100%;
            max-width: 500px;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
          max-height: min(88vh, 760px);
          display: flex;
          flex-direction: column;
        }

        .vp-team-modal-header {
            padding: 2rem 2.5rem;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
          gap: 1rem;
        }

        .vp-team-modal-header h3 {
            font-size: 1.5rem;
            font-weight: 900;
            margin: 0;
            color: #1e293b;
        }

        .vp-team-modal-close {
          background: #f1f5f9;
          border: none;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          flex-shrink: 0;
        }

        .vp-team-modal-body {
            padding: 2.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .vp-team-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .vp-team-form .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .vp-team-form label {
            font-weight: 800;
            font-size: 0.9rem;
            color: #475569;
        }

        .vp-team-form input, .vp-team-form select {
            padding: 1rem 1.25rem;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            font-weight: 600;
            font-size: 1rem;
            outline: none;
            background: #f8fafc;
        }

        .vp-team-form input:focus {
             border-color: #38AC57;
             background: white;
        }

        .vp-team-modal-footer {
            padding: 1.5rem 2.5rem 2.5rem 2.5rem;
            border-top: 1px solid #f1f5f9;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background: white;
        }

        .vp-team-modal-footer-actions {
            display: flex;
            gap: 1rem;
        }

        .vp-team-modal-btn {
            flex: 1;
            padding: 1rem;
            border-radius: 100px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 1rem;
        }

        .vp-team-modal-btn.cancel {
            background: #f1f5f9;
            color: #64748b;
        }

        .vp-team-modal-btn.save {
            background: #38AC57;
            color: white;
        }

        .vp-team-modal-inline-error {
          padding: 0.875rem 1rem;
          border-radius: 12px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .vp-team-modal {
            max-width: 94vw;
            max-height: 92vh;
            border-radius: 20px;
          }
          .vp-team-modal-header,
          .vp-team-modal-body,
          .vp-team-modal-footer {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
          }
          .vp-team-modal-header {
            padding-top: 1.25rem;
            padding-bottom: 1.25rem;
          }
          .vp-team-modal-body {
            padding-top: 1.25rem;
            padding-bottom: 1.25rem;
          }
          .vp-team-modal-footer {
            padding-top: 1rem;
            padding-bottom: 1.25rem;
          }
          .vp-team-modal-inline-error {
            width: 100%;
            box-sizing: border-box;
          }
          .vp-team-modal-footer-actions {
            flex-direction: column;
          }
        }

        .vp-view-details {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
            text-align: center;
        }
        
        .vp-detail-row {
            width: 100%;
            text-align: left;
        }

        .vp-detail-row label {
            display: block;
            font-size: 0.8rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 0.4rem;
        }

        .vp-detail-row .value {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1e293b;
        }

      `}</style>

      {/* Stats Grid */}
      <div className="vp-stats-grid">
        {dynamicStats.map((stat, index) => {
          const isActive = activeFilter === stat.label;
          return (
            <div
              key={index}
              className={`vp-stat-card ${isActive ? "active" : ""}`}
              onClick={() => setActiveFilter(stat.label)}
            >
              <div className="vp-stat-icon-box">
                <img
                  src={stat.icon}
                  alt=""
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div className="vp-stat-main">
                <span className="label">{stat.label}</span>
                <span className="vp-stat-value">{stat.value}</span>
              </div>

              <div className="vp-trend-indicator">
                <ArrowUpRight size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="vp-controls-bar">
        <div className="vp-search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            size={20}
            style={{
              position: "absolute",
              left: "1.25rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
        </div>

        <div className="vp-filter-group">
          <button
            className="vp-filter-btn"
            onClick={() => {
              setActiveFilter("Status Filter Active");
              setLastAction("Filtering by Status...");
            }}
          >
            Status <ChevronDown size={18} />
          </button>
          <button
            className="vp-filter-btn"
            onClick={() => {
              setActiveFilter("Category Filter Active");
              setLastAction("Filtering by Category...");
            }}
          >
            Category <ChevronDown size={18} />
          </button>
          <button
            className="vp-filter-btn"
            onClick={() => {
              setActiveFilter("Advanced Filters Active");
              setLastAction("Opening Filters...");
            }}
          >
            <Filter size={18} /> Filters
          </button>
          {activeFilter !== "Total Members" && (
            <button
              className="vp-filter-btn"
              style={{ background: "#f1f5f9", color: "#64748b" }}
              onClick={() => {
                setActiveFilter("Total Members");
                setLastAction("Filters Cleared");
              }}
            >
              Clear: {activeFilter} ×
            </button>
          )}
        </div>

        <button className="vp-add-btn" onClick={handleAddClick}>
          <Plus size={22} />
          Add Team Member
        </button>
      </div>

      {/* Members Table */}
      <div className="vp-table-card">
        <div className="vp-table-header">
          <h3>Team Members List</h3>
          <p>Manage and monitor your platform administrative team</p>
        </div>

        <div className="vp-table-scroll">
          <table className="vp-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="vp-member-cell">
                        <UserAvatar
                          src={getAvatarSrc(member.avatar)}
                          name={member.name}
                          size={52}
                          showBadge={true}
                        />
                        <div className="vp-member-info">
                          <span className="name">{member.name}</span>
                          <span className="email">{member.email}</span>
                          {(member.job_title || member.employee_id) && (
                            <span className="email">
                              {member.job_title || member.employee_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="vp-badge dept">
                        {member.department || member.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`vp-badge ${member.status === "Available" ? "status-active" : "status-pending"}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      {member.last_login && !member.last_logout ? (
                        <CheckCircle2
                          size={24}
                          color="#38AC57"
                          fill="#f0fdf4"
                        />
                      ) : (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontWeight: "800",
                            fontSize: "0.85rem",
                          }}
                        >
                          DISABLED
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="vp-last-login">
                        {formatLastSeen(member.last_login)}
                      </span>
                    </td>
                    <td>
                      <div className="vp-action-btn-group">
                        <button
                          className="vp-filter-btn"
                          onClick={() => handleViewClick(member)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="vp-filter-btn"
                          onClick={() => handleEditClick(member)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="vp-filter-btn"
                          style={{ borderColor: "#fee2e2", color: "#ef4444" }}
                          onClick={() => handleDelete(member.id, member.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "5rem",
                      color: "#64748b",
                      fontWeight: "600",
                    }}
                  >
                    No members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Member Modal */}
      {isModalOpen && (
        <div
          className="vp-team-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="vp-team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp-team-modal-header">
              <h3>
                {modalMode === "add"
                  ? "Add Member"
                  : modalMode === "edit"
                    ? "Edit Member"
                    : "Member Profile"}
              </h3>
              <button
                className="vp-team-modal-close"
                onClick={() => setIsModalOpen(false)}
                type="button"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="vp-team-modal-body">
              {modalMode === "view" && selectedMember ? (
                <div className="vp-view-details">
                  <UserAvatar
                    src={getAvatarSrc(selectedMember.avatar)}
                    name={selectedMember.name}
                    size={100}
                    showBadge={true}
                  />
                  <div className="vp-detail-row">
                    <label>Full Name</label>
                    <div className="value">{selectedMember.name}</div>
                  </div>
                  <div className="vp-detail-row">
                    <label>Email Address</label>
                    <div className="value">{selectedMember.email}</div>
                  </div>
                  <div className="vp-detail-row">
                    <label>Department / Role</label>
                    <div className="value">
                      {selectedMember.department || selectedMember.role}
                    </div>
                  </div>
                  <div className="vp-detail-row">
                    <label>Job Title</label>
                    <div className="value">
                      {selectedMember.job_title || "Not set"}
                    </div>
                  </div>
                  <div className="vp-detail-row">
                    <label>Employee ID</label>
                    <div className="value">
                      {selectedMember.employee_id || "Not set"}
                    </div>
                  </div>
                  <div className="vp-detail-row">
                    <label>City</label>
                    <div className="value">
                      {selectedMember.city || "Not set"}
                    </div>
                  </div>
                  <div className="vp-detail-row">
                    <label>Status</label>
                    <div className="value">{selectedMember.status}</div>
                  </div>
                  <div className="vp-detail-row">
                    <label>Last Login</label>
                    <div className="value">
                      {formatLastSeen(selectedMember.last_login)}
                    </div>
                  </div>
                </div>
              ) : (
                <form className="vp-team-form" onSubmit={handleSaveMember}>
                  <div className="input-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  {modalMode === "add" && (
                    <div className="input-group">
                      <label>Employee ID</label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            employeeId: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  {modalMode === "add" && (
                    <div className="input-group">
                      <label>Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                      />
                    </div>
                  )}
                  <div className="input-group">
                    <label>Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Admin">Admin</option>
                      <option value="Moderator">Moderator</option>
                      <option value="Developer">Developer</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  {modalMode === "edit" && (
                    <div className="input-group">
                      <label>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as "Available" | "Inactive",
                          })
                        }
                      >
                        <option value="Available">Available</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                  <div className="input-group">
                    <label>Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                    >
                      <option value="Operation">Operation</option>
                      <option value="Tech">Tech</option>
                      <option value="Product">Product</option>
                      <option value="Ops">Ops</option>
                      <option value="Support">Support</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Job Title</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, jobTitle: e.target.value })
                      }
                    />
                  </div>
                  <div className="input-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  {modalMode === "add" && (
                    <div className="input-group">
                      <label>Welcome Message</label>
                      <input
                        type="text"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>
                  )}
                </form>
              )}
            </div>

            <div className="vp-team-modal-footer">
              {modalMode !== "view" && modalError && (
                <div className="vp-team-modal-inline-error" role="alert">
                  {modalError}
                </div>
              )}
              <div className="vp-team-modal-footer-actions">
                <button
                  className="vp-team-modal-btn cancel"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  {modalMode === "view" ? "Close" : "Cancel"}
                </button>
                {modalMode !== "view" && (
                  <button
                    className="vp-team-modal-btn save"
                    type="button"
                    onClick={handleSaveMember}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : modalMode === "add"
                        ? "Add Member"
                        : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {lastAction && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            background: "#111827",
            color: "white",
            padding: "1rem 2rem",
            borderRadius: "100px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 11050,
            animation: "slideUp 0.3s ease-out",
          }}
        >
          <CheckCircle2 size={20} color="#38AC57" />
          <span style={{ fontWeight: "700" }}>{lastAction}</span>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
