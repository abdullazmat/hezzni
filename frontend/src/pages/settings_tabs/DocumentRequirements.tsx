import { useState, useEffect } from "react";
import { Eye, Edit2, Trash2, X } from "lucide-react";
import {
  extractArrayPayload,
  getDocumentRequirementsApi,
  updateDocumentRequirementApi,
  deleteDocumentRequirementApi,
} from "../../services/api";

export const DocumentRequirements = () => {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await getDocumentRequirementsApi();
      if (res.ok && res.data) {
        const list = extractArrayPayload(res.data, [
          "requirements",
          "documents",
          "items",
          "rows",
          "list",
          "data",
        ]);
        if (Array.isArray(list)) {
          setDocumentTypes(
            list.map((doc: any) => ({
              id: doc.id,
              name: doc.documentName || doc.name || "",
              description: doc.description || "",
              types: doc.userTypes || doc.types || [],
              limits: doc.maxFileSize
                ? `Max: ${doc.maxFileSize}`
                : doc.limits || "Max: 5MB",
              formats: doc.allowedFormats || doc.formats || "JPG, PNG, PDF",
            })),
          );
        } else {
          setDocumentTypes([]);
        }
      }
    } catch (e) {
      console.error("Failed to load document requirements", e);
      setDocumentTypes([]);
    }
    setLoading(false);
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Are you sure you want to delete ${doc.name}?`)) return;
    try {
      const res = await deleteDocumentRequirementApi(doc.id);
      if (res.ok) {
        setDocumentTypes((prev) => prev.filter((d) => d.id !== doc.id));
      } else {
        alert("Failed to delete document requirement");
      }
    } catch (e) {
      alert("Error deleting document requirement");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc?.id) return;
    try {
      const res = await updateDocumentRequirementApi(
        selectedDoc.id,
        selectedDoc,
      );
      if (res.ok) {
        loadDocuments();
        setIsModalOpen(false);
      } else {
        alert("Failed to update document requirement");
      }
    } catch (e) {
      alert("Error updating document requirement");
    }
  };

  return (
    <div className="vp-documents-container">
      <style>{`
        .vp-documents-container {
            animation: fadeIn 0.4s ease-out;
        }

        .vp-documents-header {
            margin-bottom: 2.5rem;
        }

        .vp-documents-header h2 {
            font-size: 1.75rem;
            font-weight: 900;
            color: #1e293b;
            margin: 0;
            letter-spacing: -0.025em;
        }

        .vp-documents-header p {
            color: #64748b;
            margin: 0.5rem 0 0 0;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .vp-table-card {
            background: white;
            border-radius: 32px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }

        .vp-table-scroll {
            overflow-x: auto;
        }

        .vp-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 900px;
        }

        .vp-table th {
            background: #f8fafc;
            padding: 1.25rem 1.5rem;
            text-align: left;
            font-size: 0.875rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e2e8f0;
        }

        .vp-table td {
            padding: 1.5rem;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .vp-doc-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .vp-doc-name {
            font-weight: 800;
            font-size: 1.05rem;
            color: #1e293b;
        }

        .vp-doc-desc {
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 500;
        }

        .vp-badge-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .vp-type-badge {
            background: #f1f5f9;
            color: #475569;
            padding: 0.4rem 1rem;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 700;
            border: 1px solid #e2e8f0;
        }

        .vp-limit-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .vp-limit-main {
            font-weight: 800;
            font-size: 0.9rem;
            color: #1e293b;
        }

        .vp-limit-sub {
            font-size: 0.75rem;
            color: #64748b;
            font-weight: 600;
        }

        .vp-action-group {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
        }

        .vp-action-btn {
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            color: #64748b;
        }

        .vp-action-btn.view {
            padding: 0 1.25rem;
            gap: 0.5rem;
            font-weight: 700;
            font-size: 0.85rem;
        }

        .vp-action-btn.view:hover {
            border-color: #38AC57;
            color: #38AC57;
            background: #f0fdf4;
        }

        .vp-action-btn.edit {
            width: 40px;
        }

        .vp-action-btn.edit:hover {
            border-color: #38AC57;
            color: #38AC57;
            background: #f0fdf4;
        }

        .vp-action-btn.delete {
            width: 40px;
        }

        .vp-action-btn.delete:hover {
            border-color: #ef4444;
            color: #ef4444;
            background: #fef2f2;
        }

        @media (max-width: 768px) {
            .vp-table-card {
                border-radius: 20px;
            }
        }

        .vp-doc-modal-overlay {
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

        .vp-doc-modal {
            background: white;
            border-radius: 32px;
            width: 100%;
            max-width: 550px;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
        }

        .vp-modal-header {
            padding: 2rem 2.5rem;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .vp-modal-header h3 {
            font-size: 1.5rem;
            font-weight: 900;
            margin: 0;
            color: #1e293b;
        }

        .vp-modal-close {
            background: #f1f5f9;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #64748b;
        }

        .vp-modal-body {
            padding: 2.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .vp-info-block label {
            display: block;
            font-size: 0.9rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.75rem;
        }

        .vp-info-block .content {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1e293b;
            line-height: 1.5;
        }

        .vp-edit-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .vp-edit-form .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .vp-edit-form label {
            font-weight: 800;
            font-size: 0.9rem;
            color: #475569;
        }

        .vp-edit-form input, .vp-edit-form textarea {
            padding: 1rem 1.25rem;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            font-weight: 600;
            font-size: 1rem;
            outline: none;
            background: #f8fafc;
        }

        .vp-edit-form input:focus {
             border-color: #38AC57;
             background: white;
        }

        .vp-modal-footer {
            padding: 1.5rem 2.5rem 2.5rem 2.5rem;
            border-top: 1px solid #f1f5f9;
            display: flex;
            gap: 1rem;
        }

        .vp-modal-btn {
            flex: 1;
            padding: 1rem;
            border-radius: 100px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 1rem;
        }

        .vp-modal-btn.cancel {
            background: #f1f5f9;
            color: #64748b;
        }

        .vp-modal-btn.save {
            background: #38AC57;
            color: white;
        }

      `}</style>

      <div className="vp-documents-header">
        <h2>Document Requirements</h2>
        <p>
          Configure required documents and validation rules for different user
          types
        </p>
      </div>

      <div className="vp-table-card">
        <div className="vp-table-scroll">
          {loading ? (
            <p
              style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}
            >
              Loading document requirements...
            </p>
          ) : documentTypes.length === 0 ? (
            <p
              style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}
            >
              No document requirement data returned from API.
            </p>
          ) : (
            <table className="vp-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>User Types</th>
                  <th>Requirements</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentTypes.map((doc, index) => (
                  <tr key={doc.id || index}>
                    <td>
                      <div className="vp-doc-info">
                        <span className="vp-doc-name">{doc.name}</span>
                        <span className="vp-doc-desc">{doc.description}</span>
                      </div>
                    </td>
                    <td>
                      <div className="vp-badge-group">
                        {doc.types.map((type: string, i: number) => (
                          <span key={i} className="vp-type-badge">
                            {type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="vp-limit-info">
                        <span className="vp-limit-main">{doc.limits}</span>
                        <span className="vp-limit-sub">{doc.formats}</span>
                      </div>
                    </td>
                    <td>
                      <div className="vp-action-group">
                        <button
                          className="vp-action-btn view"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setModalMode("view");
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye size={18} /> View
                        </button>
                        <button
                          className="vp-action-btn edit"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setModalMode("edit");
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="vp-action-btn delete"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Document Modal */}
      {isModalOpen && selectedDoc && (
        <div
          className="vp-doc-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="vp-doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp-modal-header">
              <h3>
                {modalMode === "view" ? "Document Details" : "Edit Requirement"}
              </h3>
              <button
                className="vp-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="vp-modal-body">
              {modalMode === "view" ? (
                <>
                  <div className="vp-info-block">
                    <label>Document Name</label>
                    <div className="content">{selectedDoc.name}</div>
                  </div>
                  <div className="vp-info-block">
                    <label>Description</label>
                    <div className="content">{selectedDoc.description}</div>
                  </div>
                  <div className="vp-info-block">
                    <label>User Types</label>
                    <div
                      className="vp-badge-group"
                      style={{ marginTop: "0.5rem" }}
                    >
                      {selectedDoc.types.map((t: string, i: number) => (
                        <span key={i} className="vp-type-badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="vp-info-block">
                    <label>File Requirements</label>
                    <div className="content">
                      {selectedDoc.limits} • {selectedDoc.formats}
                    </div>
                  </div>
                </>
              ) : (
                <form
                  className="vp-edit-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setIsModalOpen(false);
                  }}
                >
                  <div className="input-group">
                    <label>Document Name</label>
                    <input type="text" defaultValue={selectedDoc.name} />
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea defaultValue={selectedDoc.description} rows={3} />
                  </div>
                  <div className="input-group">
                    <label>Size Limit (MB)</label>
                    <input type="text" defaultValue="5" />
                  </div>
                </form>
              )}
            </div>

            <div className="vp-modal-footer">
              <button
                className="vp-modal-btn cancel"
                onClick={() => setIsModalOpen(false)}
              >
                {modalMode === "view" ? "Close" : "Cancel"}
              </button>
              {modalMode === "edit" && (
                <button className="vp-modal-btn save" onClick={handleSaveEdit}>
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
