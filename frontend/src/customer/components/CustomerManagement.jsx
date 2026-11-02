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
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

function StatCard({ title, value, icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className={`rounded-xl px-3 py-2 text-lg ${color}`}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

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
    ["email", "Email", false],
    ["date_of_birth", "Date of birth", false],
    ["occupation", "Occupation", false],
    ["monthly_income", "Monthly income", false],
    ["branch_id", "Branch ID", false],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {customer ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the customer details below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(([name, label, required]) => (
              <label key={name} className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
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
                />
              </label>
            ))}

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Gender</span>
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

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Present address
            </span>
            <textarea
              className={inputClass}
              rows={2}
              name="present_address"
              value={form.present_address ?? ""}
              onChange={updateField}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Permanent address
            </span>
            <textarea
              className={inputClass}
              rows={2}
              name="permanent_address"
              value={form.permanent_address ?? ""}
              onChange={updateField}
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_active"
              checked={Boolean(form.is_active)}
              onChange={updateField}
              className="h-4 w-4 accent-blue-700"
            />
            Customer is active
          </label>

          {error && (
            <p className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
        String(value || "")
          .toLowerCase()
          .includes(term),
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
        },
      );

      if (isEditing) {
        setCustomers((current) =>
          current.map((c) => (c.id === saved.id ? saved : c)),
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
      `Delete ${customer.first_name} ${customer.last_name}?`,
    );
    if (!confirmed) return;

    try {
      await apiRequest(`/api/customer/${customer.id}/`, {
        method: "DELETE",
      });
      setCustomers((current) => current.filter((c) => c.id !== customer.id));
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
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      columns.join(","),
      ...filteredCustomers.map((customer) =>
        columns.map((key) => escape(customer[key])).join(","),
      ),
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "smlnexgen-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        {/* <aside className="hidden w-64 shrink-0 flex-col bg-blue-950 px-5 py-7 text-white lg:flex">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-blue-900">
              S
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-wide">SMLNEXGEN</p>
              <p className="text-xs text-blue-200">Microfinance System</p>
            </div>
          </div>

          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-blue-300">
            Main menu
          </p>
          <nav className="space-y-1">
            {[
              ["▦", "Dashboard"],
              ["♙", "Customers"],
              ["▤", "Loans"],
              ["₹", "Collections"],
              ["◷", "EMI Schedule"],
              ["▧", "Reports"],
              ["⚙", "Settings"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                  label === "Customers"
                    ? "bg-blue-700 font-semibold text-white"
                    : "text-blue-100 hover:bg-blue-900"
                }`}
              >
                <span>{icon}</span>
                {label}
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-blue-800 bg-blue-900/70 p-4">
            <p className="text-sm font-semibold">Customer Management</p>
            <p className="mt-1 text-xs leading-5 text-blue-200">
              Manage customer records from one place.
            </p>
          </div>
        </aside> */}

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs font-medium text-slate-400">
                SMLNEXGEN / Management
              </p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                Customer Management
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">Administrator</p>
                <p className="text-xs text-slate-500">System Admin</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                A
              </div>
            </div>
          </header>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Customer Overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  View and manage registered customers.
                </p>
              </div>
              <button
                onClick={() => setModalCustomer(null)}
                className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900"
              >
                + Add Customer
              </button>
            </div>

            {notice && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {notice}
              </div>
            )}
            {error && (
              <div className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
                <button
                  onClick={loadCustomers}
                  className="ml-3 font-bold underline"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Customers"
                value={customers.length}
                icon="♙"
                color="bg-blue-50 text-blue-700"
              />
              <StatCard
                title="Active Customers"
                value={activeCount}
                icon="✓"
                color="bg-green-50 text-green-700"
              />
              <StatCard
                title="Inactive Customers"
                value={inactiveCount}
                icon="◷"
                color="bg-amber-50 text-amber-700"
              />
              <StatCard
                title="Showing Results"
                value={filteredCustomers.length}
                icon="⌕"
                color="bg-violet-50 text-violet-700"
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-bold">Customer Directory</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Search and manage customer information.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className={`${inputClass} sm:w-64`}
                    placeholder="Search name, phone, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    className={inputClass}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All customers</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button
                    onClick={exportCSV}
                    className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Mobile</th>
                      <th className="px-5 py-4">Occupation</th>
                      <th className="px-5 py-4">Monthly Income</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-12 text-center text-slate-500"
                        >
                          Loading customers...
                        </td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-12 text-center">
                          <p className="font-semibold text-slate-700">
                            No customers found
                          </p>
                          <p className="mt-1 text-slate-500">
                            Try another search or add a customer.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-blue-50/40">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                                {(customer.first_name || "C")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {customer.first_name} {customer.last_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {customer.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {customer.mobile_number || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {customer.occupation || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {customer.monthly_income
                              ? `₹${Number(customer.monthly_income).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                customer.is_active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {customer.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                title="View"
                                onClick={() =>
                                  window.alert(
                                    `${customer.first_name} ${customer.last_name}\nMobile: ${customer.mobile_number || "—"}\nEmail: ${customer.email || "—"}`,
                                  )
                                }
                                className="rounded-lg border px-3 py-2 text-blue-700 hover:bg-blue-50"
                              >
                                View
                              </button>
                              <button
                                title="Edit"
                                onClick={() => setModalCustomer(customer)}
                                className="rounded-lg border px-3 py-2 text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                title="Delete"
                                onClick={() => deleteCustomer(customer)}
                                className="rounded-lg border border-red-100 px-3 py-2 text-red-600 hover:bg-red-50"
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

              <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                Showing {filteredCustomers.length} of {customers.length}{" "}
                customers
              </div>
            </section>
          </div>
        </main>
      </div>

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
