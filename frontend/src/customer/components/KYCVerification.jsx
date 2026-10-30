
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
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatusBadge({ status }) {
  const styles = {
    verified: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
    pending: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {String(status || "pending").toUpperCase()}
    </span>
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

  // IMPORTANT: Backend requires customer field
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

    // Reset only the file input
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
          : "Document rejected."
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-2 font-bold underline"
          >
            Close
          </button>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Customer KYC Verification
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload Identity and Address documents for every group member.
          </p>
        </div>

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
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          Upload KYC Document
        </h3>

        <form
          key={customerId}
          onSubmit={uploadDocument}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <label className="text-sm font-semibold text-slate-700">
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

          <label className="text-sm font-semibold text-slate-700">
            Document Reference Number
            <input
              value={documentReference}
              onChange={(event) => setDocumentReference(event.target.value)}
              placeholder="Enter reference number"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Document File
            <input
  ref={fileInputRef}
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={(event) =>
    setDocumentFile(event.target.files?.[0] || null)
  }
  className={inputClass}
/>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              PDF, JPG or PNG. File size limits should also be enforced by the backend.
            </span>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={busy || !customerId}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {busy ? "Please wait..." : "Upload Document"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Uploaded Documents
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Verify identity and address documents separately.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDocuments}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loadingDocuments ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading documents...
          </p>
        ) : documents.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No KYC documents uploaded for this customer.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <article key={document.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold capitalize text-slate-900">
                      {String(document.document_type).replace("_", " ")} proof
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Reference: {document.document_reference || "Not provided"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Document ID: {document.id}
                    </p>
                  </div>
                  <StatusBadge status={document.status} />
                </div>

                {document.verification_notes && (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    Notes: {document.verification_notes}
                  </p>
                )}

                {document.status === "pending" && (
                  <div className="space-y-3">
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
                      <div className="space-y-2">
                        <textarea
                          value={rejectionNote}
                          onChange={(event) =>
                            setRejectionNote(event.target.value)
                          }
                          placeholder="Reason for rejection (required)"
                          rows={2}
                          className={inputClass}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              verifyDocument(document.id, "rejected")
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectionId(null);
                              setRejectionNote("");
                            }}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            verifyDocument(document.id, "verified")
                          }
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setRejectionId(document.id);
                            setRejectionNote("");
                          }}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
                        >
                          Reject
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
