import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const FD = () => {
  const { user } = useAuth();
  const role = user?.profile?.role || user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isRDAdmin = role === "RD_FD_ADMIN" || isSuperAdmin;

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "products" : "accounts");
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ========== FETCH DATA ==========
  const fetchProducts = async () => {
    try {
      const res = await api.get("fd/products/");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get("fd/accounts/");
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (isRDAdmin) fetchAccounts();
  }, []);

  // ========== PRODUCT FORM STATE ==========
  const initialProductForm = {
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
    effective_from: new Date().toISOString().split("T")[0],
    valid_until: null,
    min_amount: "",
    max_amount: "",
    is_senior_citizen: false,
    senior_extra_rate: 0,
    interest_type: "COMPOUND",
    interest_rate: "",
    compounding_frequency: "QUARTERLY",
    payout_frequency: "AT_MATURITY",
    tenure_unit: "MONTHS",
    min_tenure: "",
    max_tenure: "",
    default_maturity_instruction: "PAY_PRINCIPAL_INTEREST",
    premature_allowed: true,
    lock_in_days: 0,
    penalty_type: "PERCENT_INTEREST",
    penalty_value: 0,
    maker_checker_required: false,
    approval_limit: 0,
    nominee_required: true,
    tds_applicable: true,
  };

  const [productForm, setProductForm] = useState(initialProductForm);

  // ========== ACCOUNT FORM STATE ==========
  const [accountForm, setAccountForm] = useState({
    product: "",
    deposit_amount: "",
    tenure_value: "",
    start_date: new Date().toISOString().split("T")[0],
    maturity_instruction: "PAY_PRINCIPAL_INTEREST",
    nominee_name: "",
    nominee_relation: "",
  });

  // ========== HANDLERS ==========
  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerSearch = async (value) => {
    setCustomerSearch(value);
    setSelectedCustomer(null);

    if (value.trim().length < 2) {
      setCustomerResults([]);
      return;
    }

    try {
      const res = await api.get(`customer/?q=${value}`);
      setCustomerResults(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      setCustomerResults([]);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.first_name} ${customer.last_name}`);
    setCustomerResults([]);
  };

  const openProductForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        ...product,
        valid_until: product.valid_until || null,
      });
    } else {
      setEditingProduct(null);
      setProductForm(initialProductForm);
    }
    setShowProductForm(true);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productForm,
        min_amount: Number(productForm.min_amount),
        max_amount: Number(productForm.max_amount),
        interest_rate: Number(productForm.interest_rate),
        senior_extra_rate: Number(productForm.senior_extra_rate || 0),
        min_tenure: Number(productForm.min_tenure),
        max_tenure: Number(productForm.max_tenure),
        lock_in_days: Number(productForm.lock_in_days || 0),
        penalty_value: Number(productForm.penalty_value || 0),
        approval_limit: Number(productForm.approval_limit || 0),
        valid_until: productForm.valid_until || null,
      };

      if (editingProduct) {
        await api.put(`fd/products/${editingProduct.id}/`, payload);
        showToast("success", "FD Product updated successfully");
      } else {
        await api.post("fd/products/", payload);
        showToast("success", "FD Product created successfully");
      }
      setShowProductForm(false);
      fetchProducts();
    } catch (err) {
      const msg =
        err.response?.data?.code?.[0] ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Failed to save product";
      showToast("error", typeof msg === "string" ? msg : "Failed to save product");
    }
  };

  const saveAccount = async (e) => {
    e.preventDefault();

    if (!selectedCustomer) {
      showToast("error", "Please select a customer");
      return;
    }

    try {
      await api.post("fd/accounts/", {
        product: Number(accountForm.product),
        customer: selectedCustomer.id,
        deposit_amount: Number(accountForm.deposit_amount),
        tenure_value: Number(accountForm.tenure_value),
        start_date: accountForm.start_date,
        maturity_instruction: accountForm.maturity_instruction || "PAY_PRINCIPAL_INTEREST",
        nominee_name: accountForm.nominee_name || "",
        nominee_relation: accountForm.nominee_relation || "",
      });

      setShowAccountForm(false);
      setSelectedCustomer(null);
      setCustomerSearch("");
      setCustomerResults([]);
      setAccountForm({
        product: "",
        deposit_amount: "",
        tenure_value: "",
        start_date: new Date().toISOString().split("T")[0],
        maturity_instruction: "PAY_PRINCIPAL_INTEREST",
        nominee_name: "",
        nominee_relation: "",
      });
      fetchAccounts();
      showToast("success", "FD Account opened successfully");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Failed to create FD account";
      showToast("error", typeof msg === "string" ? msg : "Failed to create FD account");
    }
  };

  const approveAccount = async (id) => {
    if (!window.confirm("Approve this FD account?")) return;
    try {
      await api.post(`fd/accounts/${id}/approve/`);
      fetchAccounts();
      showToast("success", "FD Account approved successfully");
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Approval failed");
    }
  };

  const prematureClose = async (id) => {
    if (!window.confirm("Close this FD prematurely?")) return;
    try {
      const res = await api.post(`fd/accounts/${id}/premature-close/`);
      showToast("success", `Closed. Payout: ₹${res.data.payout_amount}`);
      fetchAccounts();
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to close");
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const getStatusBadge = (status) => {
    const map = {
      ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      MATURED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      CLOSED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
      PREMATURE_CLOSED: "bg-red-50 text-red-700 ring-1 ring-red-200",
      DRAFT: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
      INACTIVE: "bg-red-50 text-red-700 ring-1 ring-red-200",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
          map[status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
        }`}
      >
        {status?.replaceAll("_", " ")}
      </span>
    );
  };

  // Shared styles
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-6 z-[100] sm:right-6">
          <div
            className={`flex min-w-[280px] max-w-md items-center gap-3 rounded-2xl border px-5 py-4 shadow-xl ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-white ${
                toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
              }`}
            >
              {toast.type === "success" ? "✓" : "!"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-lg leading-none text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* PAGE HEADER */}
        <div className="mt-12 flex flex-col justify-between gap-4 sm:mt-8 sm:flex-row sm:items-center lg:mt-0">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7890B1]">
              Deposits
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-3xl">
              Fixed Deposit
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {isSuperAdmin
                ? "Manage FD products and customer accounts"
                : "Open and manage fixed deposit accounts"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isSuperAdmin && (
              <button
                onClick={() => openProductForm()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="text-base">+</span>
                New Product
              </button>
            )}
            {isRDAdmin && (
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                  setCustomerResults([]);
                  setShowAccountForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-800"
              >
                <span className="text-lg">+</span>
                Open FD Account
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 border-b border-slate-200">
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("products")}
              className={`relative px-5 py-3 text-sm font-bold transition ${
                activeTab === "products"
                  ? "text-blue-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              FD Products
              {activeTab === "products" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("accounts")}
            className={`relative px-5 py-3 text-sm font-bold transition ${
              activeTab === "accounts"
                ? "text-blue-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            FD Accounts
            {activeTab === "accounts" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
            )}
          </button>
        </div>

        {/* ==================== PRODUCTS TAB ==================== */}
        {activeTab === "products" && isSuperAdmin && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Scheme
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Code
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Rate
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Tenure
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Amount Range
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="text-3xl text-slate-300">▤</div>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          No FD products found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Create your first product to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{p.name}</p>
                          {p.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">
                          {p.code}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-[#17365D]">
                            {p.interest_rate}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {p.min_tenure} – {p.max_tenure}{" "}
                          {p.tenure_unit?.toLowerCase()}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatCurrency(p.min_amount)} –{" "}
                          {formatCurrency(p.max_amount)}
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(p.status)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openProductForm(p)}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== ACCOUNTS TAB ==================== */}
        {activeTab === "accounts" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Account
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Product
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Deposit
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Maturity
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="text-3xl text-slate-300">▤</div>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          No FD accounts found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Open a new account to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">
                            {acc.account_number}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {acc.customer_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {acc.customer_mobile}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {acc.product_name}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#17365D]">
                          {formatCurrency(acc.deposit_amount)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">
                            {formatCurrency(acc.maturity_amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {acc.maturity_date}
                          </p>
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(acc.status)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {acc.status === "PENDING" && (
                              <button
                                onClick={() => approveAccount(acc.id)}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                              >
                                Approve
                              </button>
                            )}
                            {acc.status === "ACTIVE" && (
                              <button
                                onClick={() => prematureClose(acc.id)}
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                              >
                                Premature Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ==================== PRODUCT FORM MODAL ==================== */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowProductForm(false)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#17365D]">
                  {editingProduct ? "Edit FD Product" : "New FD Product"}
                </h2>
                <p className="text-xs text-slate-400">
                  Define scheme rules and interest parameters
                </p>
              </div>
              <button
                onClick={() => setShowProductForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={saveProduct}
              className="flex-1 space-y-6 overflow-y-auto p-6"
            >
              {/* Basic Details */}
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Basic Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Scheme Name *</label>
                    <input
                      name="name"
                      value={productForm.name}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Scheme Code *</label>
                    <input
                      name="code"
                      value={productForm.code}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleProductChange}
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      name="status"
                      value={productForm.status}
                      onChange={handleProductChange}
                      className={inputClass}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Effective From *</label>
                    <input
                      type="date"
                      name="effective_from"
                      value={productForm.effective_from}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Interest Options */}
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Interest Options
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Interest Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="interest_rate"
                      value={productForm.interest_rate}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Interest Type</label>
                    <select
                      name="interest_type"
                      value={productForm.interest_type}
                      onChange={handleProductChange}
                      className={inputClass}
                    >
                      <option value="SIMPLE">Simple</option>
                      <option value="COMPOUND">Compound</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Compounding</label>
                    <select
                      name="compounding_frequency"
                      value={productForm.compounding_frequency}
                      onChange={handleProductChange}
                      className={inputClass}
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="HALF_YEARLY">Half Yearly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Payout</label>
                    <select
                      name="payout_frequency"
                      value={productForm.payout_frequency}
                      onChange={handleProductChange}
                      className={inputClass}
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="AT_MATURITY">At Maturity</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tenure & Amount */}
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Tenure & Amount
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Min Amount *</label>
                    <input
                      type="number"
                      name="min_amount"
                      value={productForm.min_amount}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Amount *</label>
                    <input
                      type="number"
                      name="max_amount"
                      value={productForm.max_amount}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tenure Unit</label>
                    <select
                      name="tenure_unit"
                      value={productForm.tenure_unit}
                      onChange={handleProductChange}
                      className={inputClass}
                    >
                      <option value="DAYS">Days</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Min Tenure *</label>
                    <input
                      type="number"
                      name="min_tenure"
                      value={productForm.min_tenure}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Tenure *</label>
                    <input
                      type="number"
                      name="max_tenure"
                      value={productForm.max_tenure}
                      onChange={handleProductChange}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Controls
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="premature_allowed"
                      checked={productForm.premature_allowed}
                      onChange={handleProductChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Premature Closure Allowed
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="maker_checker_required"
                      checked={productForm.maker_checker_required}
                      onChange={handleProductChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Maker-Checker Required
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="nominee_required"
                      checked={productForm.nominee_required}
                      onChange={handleProductChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Nominee Required
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="tds_applicable"
                      checked={productForm.tds_applicable}
                      onChange={handleProductChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    TDS Applicable
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="is_senior_citizen"
                      checked={productForm.is_senior_citizen}
                      onChange={handleProductChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Senior Citizen Scheme
                  </label>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  {editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ACCOUNT FORM MODAL ==================== */}
      {showAccountForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowAccountForm(false)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#17365D]">
                  Open FD Account
                </h2>
                <p className="text-xs text-slate-400">
                  Link a customer to an active product
                </p>
              </div>
              <button
                onClick={() => setShowAccountForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={saveAccount}
              className="flex-1 space-y-5 overflow-y-auto p-6"
            >
              {/* Customer Search */}
              <div>
                <label className={labelClass}>
                  Search Customer (Name / Mobile) *
                </label>
                <input
                  type="text"
                  placeholder="Type at least 2 characters..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  className={inputClass}
                />

                {customerResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
                    {customerResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="cursor-pointer border-b border-slate-100 px-4 py-2.5 last:border-b-0 hover:bg-blue-50"
                      >
                        <p className="font-semibold text-slate-800">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          ID: {c.id} · {c.mobile_number}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                    <p className="font-bold text-emerald-800">
                      Selected: {selectedCustomer.first_name}{" "}
                      {selectedCustomer.last_name}
                    </p>
                    <p className="text-xs text-emerald-600">
                      ID: {selectedCustomer.id} · {selectedCustomer.mobile_number}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>FD Product *</label>
                <select
                  name="product"
                  value={accountForm.product}
                  onChange={handleAccountChange}
                  required
                  className={inputClass}
                >
                  <option value="">Select Product</option>
                  {products
                    .filter((p) => p.status === "ACTIVE")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.interest_rate}%)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Deposit Amount *</label>
                  <input
                    type="number"
                    name="deposit_amount"
                    value={accountForm.deposit_amount}
                    onChange={handleAccountChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tenure *</label>
                  <input
                    type="number"
                    name="tenure_value"
                    value={accountForm.tenure_value}
                    onChange={handleAccountChange}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Start Date *</label>
                <input
                  type="date"
                  name="start_date"
                  value={accountForm.start_date}
                  onChange={handleAccountChange}
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nominee Name</label>
                  <input
                    name="nominee_name"
                    value={accountForm.nominee_name}
                    onChange={handleAccountChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Relation</label>
                  <input
                    name="nominee_relation"
                    value={accountForm.nominee_relation}
                    onChange={handleAccountChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowAccountForm(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedCustomer}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Open FD Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FD;