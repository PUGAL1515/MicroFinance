
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
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

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

/* ---------------- STAT CARD ---------------- */

function StatCard({ title, value, icon, color, description }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {description && (
            <p className="mt-2 text-xs text-slate-400">{description}</p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CUSTOMER MODAL ---------------- */

function CustomerModal({ customer, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    ...initialForm,
    ...(customer || {}),
  }));

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
    ["first_name", "First name", true],
    ["last_name", "Last name", true],
    ["mobile_number", "Mobile number", true],
    ["email", "Email address", false],
    ["date_of_birth", "Date of birth", false],
    ["occupation", "Occupation", false],
    ["monthly_income", "Monthly income (₹)", false],
    ["branch_id", "Branch ID", false],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              {customer ? "✏️" : "👤"}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {customer ? "Edit Customer" : "Add New Customer"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Enter the customer details below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={submit}
          className="max-h-[calc(94vh-85px)] space-y-6 overflow-y-auto p-5 sm:p-7"
        >
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800">
                Personal Information
              </h3>
              <div className="mt-2 h-px bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(([name, label, required]) => (
                <label key={name}>
                  <span className={labelClass}>
                    {label}
                    {required ? " *" : ""}
                  </span>

                  <input
                    className={inputClass}
                    name={name}
                    value={form[name] ?? ""}
                    onChange={updateField}
                    required={required}
                    type={
                      name === "date_of_birth"
                        ? "date"
                        : name === "email"
                          ? "email"
                          : name === "monthly_income"
                            ? "number"
                            : "text"
                    }
                    min={name === "monthly_income" ? "0" : undefined}
                    placeholder={
                      name === "first_name"
                        ? "Enter first name"
                        : name === "last_name"
                          ? "Enter last name"
                          : name === "mobile_number"
                            ? "Enter mobile number"
                            : name === "email"
                              ? "Enter email address"
                              : name === "occupation"
                                ? "Enter occupation"
                                : name === "monthly_income"
                                  ? "Enter monthly income"
                                  : name === "branch_id"
                                    ? "Enter branch ID"
                                    : undefined
                    }
                  />
                </label>
              ))}

              <label>
                <span className={labelClass}>Gender</span>
                <select
                  className={inputClass}
                  name="gender"
                  value={form.gender ?? ""}
                  onChange={updateField}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800">
                Address Information
              </h3>
              <div className="mt-2 h-px bg-slate-100" />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>Present address</span>
                <textarea
                  className={`${inputClass} resize-y`}
                  rows={3}
                  name="present_address"
                  value={form.present_address ?? ""}
                  onChange={updateField}
                  placeholder="Enter present address"
                />
              </label>

              <label className="block">
                <span className={labelClass}>Permanent address</span>
                <textarea
                  className={`${inputClass} resize-y`}
                  rows={3}
                  name="permanent_address"
                  value={form.permanent_address ?? ""}
                  onChange={updateField}
                  placeholder="Enter permanent address"
                />
              </label>
            </div>
          </div>

          {/* Customer Status */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                checked={Boolean(form.is_active)}
                onChange={updateField}
                className="h-5 w-5 rounded accent-blue-700"
              />

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Customer is active
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enable this customer account.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Modal Actions */}
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
              className="rounded-xl bg-blue-800 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/10 transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : customer ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        </form>
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
        isEditing ? `/api/customer/${form.id}/` : "/api/customer/",
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

      setNotice(isEditing ? "Customer updated." : "Customer added.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      `Delete ${customer.first_name} ${customer.last_name}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/customer/${customer.id}/`, {
        method: "DELETE",
      });

      setCustomers((current) =>
        current.filter((c) => c.id !== customer.id)
      );

      setNotice("Customer deleted.");
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

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      <div className="w-full">
        {/* Page Header */}
        <header className="mb-7 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>SMLNEXGEN</span>
              <span>/</span>
              <span>Management</span>
              <span>/</span>
              <span className="text-blue-700">Customers</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Customer Management
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Manage and monitor all registered customer records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Administrator
              </p>
              <p className="text-xs text-slate-500">System Admin</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-blue-50 bg-blue-100 font-bold text-blue-800">
              A
            </div>
          </div>
        </header>

        <div className="space-y-7">
          {/* Page Title and Add Button */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Customer Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View, search and manage your customer information.
              </p>
            </div>

            <button
              onClick={() => setModalCustomer(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/10 transition hover:-translate-y-0.5 hover:bg-blue-900 hover:shadow-xl"
            >
              <span className="text-lg leading-none">+</span>
              Add Customer
            </button>
          </div>

          {/* Success Message */}
          {notice && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  ✓
                </span>
                {notice}
              </div>

              <button
                onClick={() => setNotice("")}
                className="rounded-lg px-2 py-1 text-green-700 hover:bg-green-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <p className="whitespace-pre-wrap">{error}</p>
              </div>

              <button
                onClick={loadCustomers}
                className="shrink-0 rounded-lg border border-red-200 bg-white px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Customers"
              value={customers.length}
              icon="👥"
              color="bg-blue-50 text-blue-700"
              description="All registered customers"
            />

            <StatCard
              title="Active Customers"
              value={activeCount}
              icon="✓"
              color="bg-emerald-50 text-emerald-700"
              description="Currently active accounts"
            />

            <StatCard
              title="Inactive Customers"
              value={inactiveCount}
              icon="◷"
              color="bg-amber-50 text-amber-700"
              description="Inactive customer accounts"
            />

            <StatCard
              title="Showing Results"
              value={filteredCustomers.length}
              icon="⌕"
              color="bg-violet-50 text-violet-700"
              description="Based on current filters"
            />
          </div>

          {/* Customer Directory */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Directory Header */}
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Customer Directory
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Search and manage customer information.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
                  {/* Search */}
                  <div className="relative sm:col-span-2 xl:w-72">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                      ⌕
                    </span>

                    <input
                      className={`${inputClass} pl-10`}
                      placeholder="Search name, phone, email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    className={`${inputClass} sm:min-w-40`}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All customers</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  {/* Export */}
                  <button
                    onClick={exportCSV}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <span>⬇</span>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Customer Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Customer</th>
                    <th className="px-5 py-4 font-bold">Mobile</th>
                    <th className="px-5 py-4 font-bold">Occupation</th>
                    <th className="px-5 py-4 font-bold">Monthly Income</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-16 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                          <p className="mt-3 font-medium text-slate-600">
                            Loading customers...
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Please wait
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                            👥
                          </div>

                          <p className="mt-4 font-bold text-slate-800">
                            No customers found
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Try another search or add a customer.
                          </p>

                          {!search && filter === "all" && (
                            <button
                              onClick={() => setModalCustomer(null)}
                              className="mt-4 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
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
                        className="transition hover:bg-blue-50/40"
                      >
                        {/* Customer */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                              {(customer.first_name || "C")[0].toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">
                                {customer.first_name} {customer.last_name}
                              </p>

                              <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                                {customer.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Mobile */}
                        <td className="px-5 py-4 font-medium text-slate-600">
                          {customer.mobile_number || "—"}
                        </td>

                        {/* Occupation */}
                        <td className="px-5 py-4 text-slate-600">
                          {customer.occupation || "—"}
                        </td>

                        {/* Income */}
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {customer.monthly_income
                            ? `₹${Number(customer.monthly_income).toLocaleString("en-IN")}`
                            : "—"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
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

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              title="View"
                              onClick={() =>
                                window.alert(
                                  `${customer.first_name} ${customer.last_name}\nMobile: ${customer.mobile_number || "—"}\nEmail: ${customer.email || "—"}`
                                )
                              }
                              className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                            >
                              View
                            </button>

                            <button
                              title="Edit"
                              onClick={() => setModalCustomer(customer)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Edit
                            </button>

                            <button
                              title="Delete"
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

            {/* Table Footer */}
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-500">
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

              <p className="text-xs text-slate-400">
                SMLNEXGEN Customer Management
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalCustomer !== undefined && (
        <CustomerModal
          customer={modalCustomer}
          saving={saving}
          onClose={() => setModalCustomer(undefined)}
          onSave={saveCustomer}
        />
      )}
    </div>
  );
}
