
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
      data?.detail ||
      (typeof data === "string" ? data : JSON.stringify(data));

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
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();

  const styles = {
    verified: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rejected: "bg-red-50 text-red-700 border-red-100",
    pending: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
        styles[normalized] || "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          normalized === "verified"
            ? "bg-emerald-500"
            : normalized === "rejected"
              ? "bg-red-500"
              : "bg-amber-500"
        }`}
      />
      {normalized}
    </span>
  );
}

function SummaryCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">
            {title}
          </p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg sm:h-11 sm:w-11 ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ icon, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function DocumentIcon({ type }) {
  const icons = {
    identity: "🪪",
    address: "🏠",
    photo: "🖼️",
    other: "📄",
  };

  return icons[type] || "📄";
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function KYCVerification({
  initialCustomerId = "",
}) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(
    String(initialCustomerId)
  );
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

      setCustomerId((current) => {
        if (
          current &&
          list.some((customer) => String(customer.id) === String(current))
        ) {
          return current;
        }

        if (
          initialCustomerId &&
          list.some(
            (customer) =>
              String(customer.id) === String(initialCustomerId)
          )
        ) {
          return String(initialCustomerId);
        }

        return list.length ? String(list[0].id) : "";
      });
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoadingCustomers(false);
    }
  }, [initialCustomerId]);

  const loadDocuments = useCallback(async () => {
    if (!customerId) {
      setDocuments([]);
      return;
    }

    try {
      setLoadingDocuments(true);
      setError("");

      const data = await apiRequest(
        `/api/customer/${customerId}/kyc/`
      );

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

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => String(customer.id) === String(customerId)
      ),
    [customers, customerId]
  );

  const customerName = (customer) =>
    customer?.full_name ||
    [customer?.first_name, customer?.last_name]
      .filter(Boolean)
      .join(" ") ||
    `Customer #${customer?.id || ""}`;

  const verifiedCount = documents.filter(
    (doc) => doc.status === "verified"
  ).length;

  const pendingCount = documents.filter(
    (doc) => doc.status === "pending"
  ).length;

  const rejectedCount = documents.filter(
    (doc) => doc.status === "rejected"
  ).length;

  const completionPercentage = documents.length
    ? Math.round((verifiedCount / documents.length) * 100)
    : 0;

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

    if (documentFile) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
      ];

      if (!allowedTypes.includes(documentFile.type)) {
        setError("Only PDF, JPG and PNG files are supported.");
        return;
      }

      if (documentFile.size > 5 * 1024 * 1024) {
        setError("File size must be below 5 MB.");
        return;
      }
    }

    const formData = new FormData();

    formData.append("customer", String(customerId));
    formData.append("document_type", documentType);
    formData.append(
      "document_reference",
      documentReference.trim()
    );

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
          : "Document rejected successfully."
      );

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Unable to update verification status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8 sm:space-y-6">

      {/* PAGE HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              CUSTOMER DOCUMENT MANAGEMENT
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              KYC Verification
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Manage customer identity and address documents,
              review submissions and complete verification.
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl">
            🛡️
          </div>
        </div>

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-24 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      {/* ALERTS */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex min-w-0 items-start gap-2">
            <span>⚠️</span>
            <p className="break-words leading-6">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded-lg px-2 py-1 font-bold hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            ✓
          </span>
          <p className="pt-1">{message}</p>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="ml-auto rounded-lg px-2 py-1 hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* CUSTOMER SELECTION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
            👤
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900">
              Customer Selection
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select a customer to manage their KYC documents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            Select Customer

            <select
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setDocuments([]);
                setError("");
                setMessage("");
                setRejectionId(null);
              }}
              className={inputClass}
              disabled={loadingCustomers}
            >
              <option value="">
                {loadingCustomers
                  ? "Loading customers..."
                  : "Choose customer"}
              </option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customerName(customer)} — #{customer.id}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Selected Customer
            </p>
            <p className="mt-1 break-words text-sm font-extrabold text-blue-950">
              {selectedCustomer
                ? customerName(selectedCustomer)
                : "No customer selected"}
            </p>
            {selectedCustomer && (
              <p className="mt-1 text-xs text-blue-600">
                Customer ID: #{selectedCustomer.id}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
        <SummaryCard
          title="Total Documents"
          value={documents.length}
          subtitle="Uploaded documents"
          icon="📁"
          color="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          title="Verified"
          value={verifiedCount}
          subtitle="Approved documents"
          icon="✓"
          color="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          title="Pending"
          value={pendingCount}
          subtitle="Awaiting review"
          icon="◷"
          color="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          title="Rejected"
          value={rejectedCount}
          subtitle="Needs correction"
          icon="✕"
          color="bg-red-50 text-red-700"
        />
      </div>

      {/* UPLOAD DOCUMENT */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeading
          icon="📤"
          title="Upload KYC Document"
          description="Add identity proof, address proof, photograph or other documents."
        />

        <form
          onSubmit={uploadDocument}
          className="grid grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-2"
        >
          <label className="block text-sm font-semibold text-slate-700">
            Document Type

            <select
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value)
              }
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
              onChange={(event) =>
                setDocumentReference(event.target.value)
              }
              placeholder="Enter reference number"
              className={inputClass}
            />
          </label>

          {/* FILE UPLOAD */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700">
              Attach Document
            </label>

            <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-blue-50/30 sm:p-7">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                  📎
                </div>

                <p className="mt-3 break-all text-sm font-bold text-slate-800">
                  {documentFile
                    ? documentFile.name
                    : "Upload customer document"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  PDF, JPG or PNG · Maximum 5 MB
                </p>

                <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800">
                  <span>↑</span>
                  Choose File

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) =>
                      setDocumentFile(
                        event.target.files?.[0] || null
                      )
                    }
                  />
                </label>

                {documentFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Remove selected file
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
            <p className="text-xs leading-5 text-slate-500">
              Make sure the uploaded document belongs to the selected customer.
            </p>

            <button
              type="submit"
              disabled={busy || !customerId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
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

      {/* DOCUMENT LIST */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeading
          icon="📂"
          title="Uploaded Documents"
          description="Review submitted documents and update their verification status."
          action={
            <button
              type="button"
              onClick={loadDocuments}
              disabled={loadingDocuments || !customerId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 sm:w-auto"
            >
              <span className={loadingDocuments ? "animate-spin" : ""}>
                ↻
              </span>
              Refresh Documents
            </button>
          }
        />

        {/* PROGRESS */}
        {documents.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Verification Progress
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {verifiedCount} of {documents.length} documents approved
                </p>
              </div>

              <span className="text-xl font-extrabold text-blue-800">
                {completionPercentage}%
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* LOADING */}
        {loadingDocuments ? (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading KYC documents...
            </p>
          </div>
        ) : !customerId ? (
          <div className="px-5 py-16 text-center">
            <p className="font-bold text-slate-800">
              Select a customer
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Choose a customer to view their documents.
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📄
            </div>

            <h4 className="mt-4 font-extrabold text-slate-800">
              No Documents Found
            </h4>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              No KYC documents have been uploaded for this customer yet.
              Upload a document to start verification.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <article
                key={document.id}
                className="p-4 transition hover:bg-slate-50/60 sm:p-6"
              >
                <div className="flex flex-col gap-4">
                  {/* DOCUMENT INFORMATION */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      <DocumentIcon type={document.document_type} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words text-sm font-extrabold capitalize text-slate-900">
                          {String(
                            document.document_type || "document"
                          ).replaceAll("_", " ")}{" "}
                          proof
                        </h4>

                        <StatusBadge status={document.status} />
                      </div>

                      <p className="mt-2 break-all text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          Reference:
                        </span>{" "}
                        {document.document_reference || "Not provided"}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>Document ID: {document.id}</span>
                        <span>
                          Uploaded:{" "}
                          {formatDate(
                            document.created_at ||
                            document.uploaded_at
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT FILE LINK */}
                  {document.document_file && (
                    <a
                      href={
                        document.document_file.startsWith("http")
                          ? document.document_file
                          : `${API_URL}${document.document_file}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      <span>↗</span>
                      View Uploaded Document
                    </a>
                  )}

                  {/* VERIFICATION NOTES */}
                  {document.verification_notes && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Verification Notes
                      </p>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                        {document.verification_notes}
                      </p>
                    </div>
                  )}

                  {/* REVIEW ACTIONS */}
                  {document.status === "pending" && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3">
                        <h5 className="text-sm font-extrabold text-slate-800">
                          Review Document
                        </h5>
                        <p className="mt-1 text-xs text-slate-500">
                          Review the uploaded document before approving or rejecting it.
                        </p>
                      </div>

                      <label className="block text-xs font-bold text-slate-600">
                        Verification Notes

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
                      </label>

                      {rejectionId === document.id ? (
                        <div className="mt-4">
                          <label className="block text-xs font-bold text-red-700">
                            Rejection Reason *

                            <textarea
                              value={rejectionNote}
                              onChange={(event) =>
                                setRejectionNote(event.target.value)
                              }
                              placeholder="Explain why this document is rejected..."
                              rows={3}
                              className={`${inputClass} resize-y border-red-200 focus:border-red-400 focus:ring-red-50`}
                            />
                          </label>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                verifyDocument(document.id, "rejected")
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                            >
                              ✕ Confirm Rejection
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setRejectionId(null);
                                setRejectionNote("");
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              verifyDocument(document.id, "verified")
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
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
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            ✕ Reject Document
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
