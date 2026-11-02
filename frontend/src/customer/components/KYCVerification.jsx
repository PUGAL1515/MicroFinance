
import { useCallback, useEffect, useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

async function apiRequest(path, options = {}) {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.detail || (typeof data === "string" ? data : JSON.stringify(data));
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return data;
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "pending").toLowerCase();

  const styles = {
    verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-red-200 bg-red-50 text-red-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide ${
        styles[normalizedStatus] ||
        "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          normalizedStatus === "verified"
            ? "bg-emerald-500"
            : normalizedStatus === "rejected"
              ? "bg-red-500"
              : "bg-amber-500"
        }`}
      />
      {normalizedStatus.toUpperCase()}
    </span>
  );
}

function SectionHeading({ icon, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function KYCVerification({ initialCustomerId = "" }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(String(initialCustomerId));
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState("identity");
  const [documentReference, setDocumentReference] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState({});
  const [rejectionId, setRejectionId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const loadCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);
      const data = await apiRequest("/api/customer/");
      const list = asList(data);
      setCustomers(list);

      if (!customerId && list.length) {
        setCustomerId(String(list[0].id));
      }
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoadingCustomers(false);
    }
  }, [customerId]);

  const loadDocuments = useCallback(async () => {
    if (!customerId) {
      setDocuments([]);
      return;
    }

    try {
      setLoadingDocuments(true);
      setError("");
      const data = await apiRequest(`/api/customer/${customerId}/kyc/`);
      setDocuments(asList(data));
    } catch (err) {
      setError(err.message || "Unable to load KYC documents.");
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadDocument = async (event) => {
    event.preventDefault();

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!documentReference.trim() && !documentFile) {
      setError("Enter a document reference or attach a document file.");
      return;
    }

    const formData = new FormData();

    // Backend requires customer field
    formData.append("customer", String(customerId));
    formData.append("document_type", documentType);
    formData.append("document_reference", documentReference.trim());

    if (documentFile) {
      formData.append("document_file", documentFile);
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");

      await apiRequest(`/api/customer/${customerId}/kyc/`, {
        method: "POST",
        body: formData,
      });

      setDocumentReference("");
      setDocumentFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage("KYC document uploaded successfully.");

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Unable to upload document.");
    } finally {
      setBusy(false);
    }
  };

  const verifyDocument = async (documentId, status) => {
    const notes =
      status === "rejected"
        ? rejectionNote
        : verificationNotes[documentId] || "";

    if (status === "rejected" && !notes.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");

      await apiRequest(`/api/customer/kyc/${documentId}/verify/`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          verification_notes: notes,
        }),
      });

      setRejectionId(null);
      setRejectionNote("");
      setVerificationNotes((previous) => ({
        ...previous,
        [documentId]: "",
      }));

      setMessage(
        status === "verified"
          ? "Document verified successfully."
          : "Document rejected.",
      );

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Unable to update verification status.");
    } finally {
      setBusy(false);
    }
  };

  const customerName = (customer) =>
    customer.full_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    `Customer #${customer.id}`;

  const verifiedCount = documents.filter(
    (document) => document.status === "verified",
  ).length;

  const pendingCount = documents.filter(
    (document) => document.status === "pending",
  ).length;

  const rejectedCount = documents.filter(
    (document) => document.status === "rejected",
  ).length;

  const completionPercentage =
    documents.length > 0
      ? Math.round((verifiedCount / documents.length) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
        <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              CUSTOMER DOCUMENT MANAGEMENT
            </div>

            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              KYC Verification
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Manage customer identity and address documents, review
              submissions, and complete verification securely.
            </p>
          </div>

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl">
            🛡️
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-28 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl" />
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <p className="whitespace-pre-line leading-6">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded-lg px-2 py-1 font-bold text-red-700 hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
            ✓
          </span>
          {message}
        </div>
      )}

      {/* Customer Selection */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
            👤
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Customer Selection</h3>
            <p className="mt-1 text-xs text-slate-500">
              Choose a customer to manage their KYC documents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            Select Customer
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className={inputClass}
              disabled={loadingCustomers}
            >
              <option value="">
                {loadingCustomers ? "Loading customers..." : "Choose customer"}
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customerName(customer)} — #{customer.id}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Selected Customer
            </p>
            <p className="mt-1 truncate text-sm font-bold text-blue-950">
              {customers.find(
                (customer) => String(customer.id) === String(customerId),
              )
                ? customerName(
                    customers.find(
                      (customer) =>
                        String(customer.id) === String(customerId),
                    ),
                  )
                : "No customer selected"}
            </p>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total Documents
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
              📁
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {documents.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Uploaded documents</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Verified</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">
              ✓
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {verifiedCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Approved documents</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Pending</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-lg">
              ◷
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Awaiting review</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Rejected</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-lg">
              ✕
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-red-600">
            {rejectedCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Requires correction</p>
        </div>
      </div>

      {/* Upload Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeading
          icon="📤"
          title="Upload KYC Document"
          description="Add identity proof, address proof, photograph or other documents."
        />

        <form
          key={customerId}
          onSubmit={uploadDocument}
          className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2"
        >
          <label className="block text-sm font-semibold text-slate-700">
            Document Type
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className={inputClass}
            >
              <option value="identity">Identity Proof</option>
              <option value="address">Address Proof</option>
              <option value="photo">Photograph</option>
              <option value="other">Other Document</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Document Reference Number
            <input
              value={documentReference}
              onChange={(event) => setDocumentReference(event.target.value)}
              placeholder="Enter document reference number"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
            Attach Document
            <div className="mt-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-blue-50/40">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                  📎
                </span>

                <span className="text-sm font-bold text-slate-800">
                  {documentFile
                    ? documentFile.name
                    : "Choose a document to upload"}
                </span>

                <span className="text-xs font-normal text-slate-500">
                  PDF, JPG or PNG files are supported
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) =>
                    setDocumentFile(event.target.files?.[0] || null)
                  }
                  className="mt-2 block w-full max-w-sm text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-800"
                />
              </div>
            </div>
            <span className="mt-2 block text-xs font-normal text-slate-400">
              File size limits should also be enforced by the backend.
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
            <p className="text-xs leading-5 text-slate-500">
              Ensure the selected document belongs to the chosen customer.
            </p>

            <button
              type="submit"
              disabled={busy || !customerId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Please wait...
                </>
              ) : (
                <>
                  <span>↑</span>
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Uploaded Documents */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeading
          icon="📂"
          title="Uploaded Documents"
          description="Review and verify customer documents individually."
          action={
            <button
              type="button"
              onClick={loadDocuments}
              disabled={loadingDocuments || !customerId}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              <span className={loadingDocuments ? "animate-spin" : ""}>
                ↻
              </span>
              Refresh
            </button>
          }
        />

        {/* Verification Progress */}
        {documents.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-600">
                Verification Progress
              </span>
              <span className="text-sm font-bold text-blue-700">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {loadingDocuments ? (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading KYC documents...
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📄
            </div>
            <h4 className="mt-4 font-bold text-slate-800">
              No Documents Found
            </h4>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              No KYC documents have been uploaded for this customer yet.
              Upload a document to start the verification process.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <article
                key={document.id}
                className="p-5 transition hover:bg-slate-50/60 sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      {document.document_type === "identity"
                        ? "🪪"
                        : document.document_type === "address"
                          ? "🏠"
                          : document.document_type === "photo"
                            ? "🖼️"
                            : "📄"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold capitalize text-slate-900">
                          {String(document.document_type).replace("_", " ")}{" "}
                          proof
                        </h4>
                        <StatusBadge status={document.status} />
                      </div>

                      <p className="mt-2 break-all text-sm text-slate-500">
                        <span className="font-semibold text-slate-600">
                          Reference:
                        </span>{" "}
                        {document.document_reference || "Not provided"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Document ID: {document.id}
                      </p>
                    </div>
                  </div>
                </div>

                {document.verification_notes && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Verification Notes
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {document.verification_notes}
                    </p>
                  </div>
                )}

                {document.status === "pending" && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3">
                      <h5 className="text-sm font-bold text-slate-800">
                        Review Document
                      </h5>
                      <p className="mt-1 text-xs text-slate-500">
                        Add notes and choose whether to approve or reject this
                        document.
                      </p>
                    </div>

                    <input
                      value={verificationNotes[document.id] || ""}
                      onChange={(event) =>
                        setVerificationNotes((previous) => ({
                          ...previous,
                          [document.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional verification notes"
                      className={inputClass}
                    />

                    {rejectionId === document.id ? (
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-semibold text-red-700">
                          Rejection Reason *
                          <textarea
                            value={rejectionNote}
                            onChange={(event) =>
                              setRejectionNote(event.target.value)
                            }
                            placeholder="Explain why this document is being rejected..."
                            rows={3}
                            className={`${inputClass} resize-y border-red-200 focus:border-red-400 focus:ring-red-50`}
                          />
                        </label>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              verifyDocument(document.id, "rejected")
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            ✕ Confirm Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectionId(null);
                              setRejectionNote("");
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            verifyDocument(document.id, "verified")
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          ✓ Verify Document
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setRejectionId(document.id);
                            setRejectionNote("");
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
