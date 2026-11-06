
import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

const initialForm = {
  first_name: "",
  last_name: "",
  mobile_number: "",
  email: "",
  gender: "",
  date_of_birth: "",
  occupation: "",
  monthly_income: "",
  present_address: "",
  permanent_address: "",
  branch_id: "",
  is_active: true,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700";

function getToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")
  );
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;

  return response.json();
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------------- ICON ---------------- */

function Icon({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${colors[color]}`}
    >
      {children}
    </div>
  );
}

/* ---------------- STAT CARD ---------------- */

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>

          <p className="mt-2 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <Icon color={color}>{icon}</Icon>
      </div>
    </div>
  );
}

/* ---------------- PAGE HEADER ---------------- */

function PageHeader() {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
          <span>SMLNEXGEN</span>
          <span>/</span>
          <span>Management</span>
          <span>/</span>
          <span className="font-semibold text-blue-700">
            Customers
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Customer Management
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Manage customer profiles, personal information and account status.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-blue-50 bg-blue-100 font-bold text-blue-800">
          A
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Administrator
          </p>
          <p className="text-xs text-slate-500">
            Finance Management
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CUSTOMER MODAL ---------------- */

function CustomerModal({ customer, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => {
    const data = { ...initialForm, ...(customer || {}) };

    if (data.date_of_birth) {
      data.date_of_birth = String(data.date_of_birth).slice(0, 10);
    }

    return data;
  });

  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save customer.");
    }
  }

  const fields = [
    {
      name: "first_name",
      label: "First Name",
      required: true,
      placeholder: "Enter first name",
    },
    {
      name: "last_name",
      label: "Last Name",
      required: true,
      placeholder: "Enter last name",
    },
    {
      name: "mobile_number",
      label: "Mobile Number",
      required: true,
      placeholder: "Enter mobile number",
    },
    {
      name: "email",
      label: "Email Address",
      placeholder: "Enter email address",
    },
    {
      name: "date_of_birth",
      label: "Date of Birth",
      type: "date",
    },
    {
      name: "occupation",
      label: "Occupation",
      placeholder: "Enter occupation",
    },
    {
      name: "monthly_income",
      label: "Monthly Income (₹)",
      type: "number",
      placeholder: "Enter monthly income",
    },
    {
      name: "branch_id",
      label: "Branch ID",
      placeholder: "Enter branch ID",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              {customer ? "✏️" : "👤"}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {customer ? "Edit Customer" : "Add New Customer"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Enter the customer information below.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={submit}
          className="space-y-6 overflow-y-auto p-6"
        >
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-blue-800">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.name}>
                  <span className={labelClass}>
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </span>

                  <input
                    className={inputClass}
                    name={field.name}
                    type={field.type || "text"}
                    value={form[field.name] ?? ""}
                    onChange={updateField}
                    required={Boolean(field.required)}
                    min={field.type === "number" ? "0" : undefined}
                    max={
                      field.type === "date"
                        ? new Date().toISOString().slice(0, 10)
                        : undefined
                    }
                    placeholder={field.placeholder || ""}
                  />
                </label>
              ))}

              <label>
                <span className={labelClass}>Gender</span>

                <select
                  className={inputClass}
                  name="gender"
                  value={form.gender || ""}
                  onChange={updateField}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wider text-blue-800">
              Address Information
            </h3>

            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>Present Address</span>

                <textarea
                  className={`${inputClass} resize-y`}
                  rows={3}
                  name="present_address"
                  value={form.present_address || ""}
                  onChange={updateField}
                  placeholder="Enter present address"
                />
              </label>

              <label className="block">
                <span className={labelClass}>Permanent Address</span>

                <textarea
                  className={`${inputClass} resize-y`}
                  rows={3}
                  name="permanent_address"
                  value={form.permanent_address || ""}
                  onChange={updateField}
                  placeholder="Enter permanent address"
                />
              </label>
            </div>
          </section>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                checked={Boolean(form.is_active)}
                onChange={updateField}
                className="h-5 w-5 accent-blue-700"
              />

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Active Customer
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Enable or disable this customer account.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-800 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/10 transition hover:bg-blue-900 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : customer
                  ? "Update Customer"
                  : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- CUSTOMER DETAILS MODAL ---------------- */

function CustomerDetailsModal({ customer, onClose, onEdit }) {
  if (!customer) return null;

  const details = [
    ["First Name", customer.first_name],
    ["Last Name", customer.last_name],
    ["Mobile Number", customer.mobile_number],
    ["Email Address", customer.email],
    ["Gender", customer.gender],
    ["Date of Birth", formatDate(customer.date_of_birth)],
    ["Occupation", customer.occupation],
    ["Monthly Income", formatCurrency(customer.monthly_income)],
    ["Branch ID", customer.branch_id],
    ["Present Address", customer.present_address],
    ["Permanent Address", customer.permanent_address],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm">
      <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Customer Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Complete customer profile information
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-blue-50 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-800 text-xl font-bold text-white">
              {(customer.first_name || "C")[0].toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-slate-900">
                {customer.first_name} {customer.last_name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {customer.mobile_number}
              </p>
            </div>

            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              customer.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}>
              {customer.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-xs font-medium text-slate-400">
                  {label}
                </p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>

            <button
              onClick={onEdit}
              className="rounded-xl bg-blue-800 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-900"
            >
              Edit Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- MAIN CUSTOMER MANAGEMENT ---------------- */

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [modalCustomer, setModalCustomer] = useState(undefined);
  const [viewCustomer, setViewCustomer] = useState(null);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/customer/");
      setCustomers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch = [
        customer.first_name,
        customer.last_name,
        customer.mobile_number,
        customer.email,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      );

      const matchesStatus =
        filter === "all" ||
        (filter === "active" && customer.is_active) ||
        (filter === "inactive" && !customer.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, filter]);

  const activeCount = customers.filter((c) => c.is_active).length;
  const inactiveCount = customers.length - activeCount;

  async function saveCustomer(form) {
    setSaving(true);
    setNotice("");

    try {
      const isEditing = Boolean(form.id);
      const payload = { ...form };

      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      const saved = await apiRequest(
        isEditing
          ? `/api/customer/${form.id}/`
          : "/api/customer/",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (isEditing) {
        setCustomers((current) =>
          current.map((c) => (c.id === saved.id ? saved : c))
        );
      } else {
        setCustomers((current) => [saved, ...current]);
      }

      setNotice(
        isEditing
          ? "Customer updated successfully."
          : "Customer added successfully."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/customer/${customer.id}/`, {
        method: "DELETE",
      });

      setCustomers((current) =>
        current.filter((c) => c.id !== customer.id)
      );

      setNotice("Customer deleted successfully.");
      setError("");
    } catch (err) {
      setError(err.message || "Unable to delete customer.");
    }
  }

  function exportCSV() {
    const columns = [
      "id",
      "first_name",
      "last_name",
      "mobile_number",
      "email",
      "gender",
      "occupation",
      "monthly_income",
      "is_active",
    ];

    const escape = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [
      columns.join(","),
      ...filteredCustomers.map((customer) =>
        columns.map((key) => escape(customer[key])).join(",")
      ),
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "smlnexgen-customers.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function openEdit(customer) {
    setViewCustomer(null);
    setModalCustomer(customer);
  }

  return (
    <div className="w-full min-w-0 text-slate-800">

      <PageHeader />

      <div className="space-y-7">

        {/* TITLE + ACTIONS */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Customer Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View, search and manage registered customer records.
            </p>
          </div>

          <button
            onClick={() => setModalCustomer(null)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/10 transition hover:-translate-y-0.5 hover:bg-blue-900"
          >
            <span className="text-xl leading-none">+</span>
            Add Customer
          </button>
        </div>

        {/* SUCCESS MESSAGE */}

        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <span>✓ &nbsp; {notice}</span>
            <button onClick={() => setNotice("")}>✕</button>
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center">
            <p className="whitespace-pre-wrap">{error}</p>
            <button
              onClick={loadCustomers}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Customers"
            value={customers.length}
            subtitle="All registered customers"
            icon="👥"
            color="blue"
          />

          <StatCard
            title="Active Customers"
            value={activeCount}
            subtitle="Currently active accounts"
            icon="✓"
            color="green"
          />

          <StatCard
            title="Inactive Customers"
            value={inactiveCount}
            subtitle="Inactive customer accounts"
            icon="◷"
            color="amber"
          />

          <StatCard
            title="Filtered Results"
            value={filteredCustomers.length}
            subtitle="Based on current filters"
            icon="⌕"
            color="purple"
          />
        </div>

        {/* CUSTOMER DIRECTORY */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* DIRECTORY HEADER */}

          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Customer Directory
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Complete list of customer records and account details.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                {/* SEARCH */}

                <div className="relative sm:w-72">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                    ⌕
                  </span>

                  <input
                    className={`${inputClass} pl-11`}
                    placeholder="Search customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* FILTER */}

                <select
                  className={`${inputClass} sm:w-40`}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* REFRESH */}

                <button
                  onClick={loadCustomers}
                  disabled={loading}
                  title="Refresh customers"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
                >
                  ↻ Refresh
                </button>

                {/* EXPORT */}

                <button
                  onClick={exportCSV}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  ↓ Export
                </button>
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold">Customer</th>
                  <th className="px-6 py-4 font-bold">Mobile Number</th>
                  <th className="px-6 py-4 font-bold">Occupation</th>
                  <th className="px-6 py-4 font-bold">Monthly Income</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                      <p className="mt-4 text-sm font-medium text-slate-500">
                        Loading customers...
                      </p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                          👥
                        </div>

                        <h3 className="mt-4 text-base font-bold text-slate-800">
                          No Customers Found
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          No matching records found. Try another search or add a customer.
                        </p>

                        {!search && filter === "all" && (
                          <button
                            onClick={() => setModalCustomer(null)}
                            className="mt-5 rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900"
                          >
                            + Add First Customer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition-colors hover:bg-blue-50/40"
                    >

                      {/* CUSTOMER */}

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                            {(customer.first_name || "C")[0].toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {customer.first_name} {customer.last_name}
                            </p>

                            <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                              {customer.email || "No email address"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* MOBILE */}

                      <td className="px-6 py-4 font-medium text-slate-600">
                        {customer.mobile_number || "—"}
                      </td>

                      {/* OCCUPATION */}

                      <td className="px-6 py-4 text-slate-600">
                        {customer.occupation || "—"}
                      </td>

                      {/* INCOME */}

                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {formatCurrency(customer.monthly_income)}
                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                            customer.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              customer.is_active
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />

                          {customer.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewCustomer(customer)}
                            className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() => setModalCustomer(customer)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteCustomer(customer)}
                            className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>

          {/* FOOTER */}

          <div className="flex flex-col justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-800">
                {filteredCustomers.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-800">
                {customers.length}
              </span>{" "}
              customers
            </p>

            <p className="text-xs font-medium text-slate-400">
              SMLNEXGEN Finance Management
            </p>
          </div>

        </section>
      </div>

      {/* ADD / EDIT MODAL */}

      {modalCustomer !== undefined && (
        <CustomerModal
          customer={modalCustomer}
          saving={saving}
          onClose={() => setModalCustomer(undefined)}
          onSave={saveCustomer}
        />
      )}

      {/* VIEW DETAILS MODAL */}

      {viewCustomer && (
        <CustomerDetailsModal
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
          onEdit={() => openEdit(viewCustomer)}
        />
      )}

    </div>
  );
}
