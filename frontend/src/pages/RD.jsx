import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const RD = () => {
  const { user } = useAuth();
  const role = user?.profile?.role || user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isRDAdmin = role === "RD_FD_ADMIN" || isSuperAdmin;

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "products" : "accounts");
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const initialProductForm = {
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
    min_instalment: "",
    max_instalment: "",
    min_tenure_months: "",
    max_tenure_months: "",
    monthly_due_day: 5,
    effective_from: new Date().toISOString().split("T")[0],
    valid_until: null,
    interest_type: "COMPOUND",
    interest_rate: "",
    compounding_frequency: "QUARTERLY",
    grace_period_days: 5,
    late_fee_type: "FLAT",
    late_fee_value: 0,
    premature_allowed: true,
    lock_in_months: 0,
    maker_checker_required: false,
  };

  const [productForm, setProductForm] = useState(initialProductForm);
  const [accountForm, setAccountForm] = useState({
    product: "",
    monthly_instalment: "",
    tenure_months: "",
    start_date: new Date().toISOString().split("T")[0],
    nominee_name: "",
    nominee_relation: "",
  });
  const [collectionForm, setCollectionForm] = useState({
    instalment: "",
    amount: "",
    payment_mode: "CASH",
    collection_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const fetchProducts = async () => {
    try {
      const res = await api.get("rd/products/");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get("rd/accounts/");
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (isRDAdmin) fetchAccounts();
  }, []);

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
      setCustomerResults([]);
    }
  };

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerSearch(`${c.first_name} ${c.last_name}`);
    setCustomerResults([]);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productForm,
        min_instalment: Number(productForm.min_instalment),
        max_instalment: Number(productForm.max_instalment),
        min_tenure_months: Number(productForm.min_tenure_months),
        max_tenure_months: Number(productForm.max_tenure_months),
        monthly_due_day: Number(productForm.monthly_due_day),
        interest_rate: Number(productForm.interest_rate),
        grace_period_days: Number(productForm.grace_period_days || 0),
        late_fee_value: Number(productForm.late_fee_value || 0),
        lock_in_months: Number(productForm.lock_in_months || 0),
        valid_until: productForm.valid_until || null,
      };
      await api.post("rd/products/", payload);
      setShowProductForm(false);
      setProductForm(initialProductForm);
      fetchProducts();
      showToast("success", "RD Product created successfully");
    } catch (err) {
      const msg =
        err.response?.data?.code?.[0] ||
        err.response?.data?.detail ||
        "Failed to create product";
      showToast("error", typeof msg === "string" ? msg : JSON.stringify(err.response?.data));
    }
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      showToast("error", "Please select a customer");
      return;
    }
    try {
      await api.post("rd/accounts/", {
        product: Number(accountForm.product),
        customer: selectedCustomer.id,
        monthly_instalment: Number(accountForm.monthly_instalment),
        tenure_months: Number(accountForm.tenure_months),
        start_date: accountForm.start_date,
        nominee_name: accountForm.nominee_name || "",
        nominee_relation: accountForm.nominee_relation || "",
      });
      setShowAccountForm(false);
      setSelectedCustomer(null);
      setCustomerSearch("");
      setAccountForm({
        product: "",
        monthly_instalment: "",
        tenure_months: "",
        start_date: new Date().toISOString().split("T")[0],
        nominee_name: "",
        nominee_relation: "",
      });
      fetchAccounts();
      showToast("success", "RD Account opened successfully");
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to open RD account");
    }
  };

  const approveAccount = async (id) => {
    if (!window.confirm("Approve this RD account?")) return;
    try {
      await api.post(`rd/accounts/${id}/approve/`);
      fetchAccounts();
      showToast("success", "RD Account approved successfully");
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Approval failed");
    }
  };

  const openCollection = async (account) => {
    try {
      const res = await api.get(`rd/accounts/${account.id}/`);
      setSelectedAccount(res.data);
      setCollectionForm({
        instalment: "",
        amount: "",
        payment_mode: "CASH",
        collection_date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
      setShowCollectionForm(true);
    } catch (err) {
      showToast("error", "Failed to load instalments");
    }
  };

  const saveCollection = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("rd/collections/", {
        instalment: Number(collectionForm.instalment),
        amount: Number(collectionForm.amount),
        payment_mode: collectionForm.payment_mode,
        collection_date: collectionForm.collection_date,
        remarks: collectionForm.remarks,
      });
      setShowCollectionForm(false);
      fetchAccounts();
      showToast("success", `Collection recorded. Receipt: ${res.data.receipt_number}`);
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Collection failed");
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
      ACTIVE: "bg-emerald-100 text-emerald-700",
      PENDING: "bg-amber-100 text-amber-700",
      MATURED: "bg-blue-100 text-blue-700",
      CLOSED: "bg-slate-100 text-slate-600",
      PREMATURE_CLOSED: "bg-red-100 text-red-700",
      DUE: "bg-slate-100 text-slate-600",
      PAID: "bg-emerald-100 text-emerald-700",
      PARTIAL: "bg-amber-100 text-amber-700",
      OVERDUE: "bg-red-100 text-red-700",
      DRAFT: "bg-slate-100 text-slate-600",
      INACTIVE: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || "bg-slate-100 text-slate-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100]">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border min-w-[300px] max-w-md ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {toast.type === "success" ? "✓" : "!"}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Recurring Deposit</h1>
          <p className="text-slate-500 mt-1">
            {isSuperAdmin ? "Manage RD Products & Accounts" : "Open and manage RD Accounts"}
          </p>
        </div>
        <div className="flex gap-3">
          {isSuperAdmin && (
            <button
              onClick={() => {
                setProductForm(initialProductForm);
                setShowProductForm(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
            >
              + New Product
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
              className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30"
            >
              + Open RD Account
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("products")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              activeTab === "products"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            RD Products
          </button>
        )}
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-5 py-2.5 text-sm font-medium transition ${
            activeTab === "accounts"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          RD Accounts
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Scheme</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Instalment</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Tenure</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                      No RD products found
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{p.name}</td>
                      <td className="px-5 py-4 text-slate-600">{p.code}</td>
                      <td className="px-5 py-4 text-slate-800">{p.interest_rate}%</td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatCurrency(p.min_instalment)} - {formatCurrency(p.max_instalment)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {p.min_tenure_months} - {p.max_tenure_months} months
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(p.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accounts Tab */}
      {activeTab === "accounts" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Account</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Instalment</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Maturity</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      No RD accounts found
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{acc.account_number}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{acc.customer_name}</p>
                        <p className="text-xs text-slate-400">{acc.customer_mobile}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">{formatCurrency(acc.monthly_instalment)}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {acc.total_instalments_paid}/{acc.tenure_months}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{formatCurrency(acc.expected_maturity_amount)}</p>
                        <p className="text-xs text-slate-400">{acc.maturity_date}</p>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(acc.status)}</td>
                      <td className="px-5 py-4 text-right space-x-2">
                        {acc.status === "PENDING" && (
                          <button
                            onClick={() => approveAccount(acc.id)}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                          >
                            Approve
                          </button>
                        )}
                        {acc.status === "ACTIVE" && (
                          <button
                            onClick={() => openCollection(acc)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                          >
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProductForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">New RD Product</h2>
              <button onClick={() => setShowProductForm(false)} className="text-slate-500 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={saveProduct} className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Basic Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Name *</label>
                    <input name="name" value={productForm.name} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Code *</label>
                    <input name="code" value={productForm.code} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea name="description" value={productForm.description} onChange={handleProductChange} rows={2}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select name="status" value={productForm.status} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Due Day</label>
                    <input type="number" name="monthly_due_day" min="1" max="28" value={productForm.monthly_due_day}
                      onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Effective From *</label>
                    <input type="date" name="effective_from" value={productForm.effective_from} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                    <input type="date" name="valid_until" value={productForm.valid_until || ""} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Instalment & Tenure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Instalment *</label>
                    <input type="number" name="min_instalment" value={productForm.min_instalment} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Instalment *</label>
                    <input type="number" name="max_instalment" value={productForm.max_instalment} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Tenure (Months) *</label>
                    <input type="number" name="min_tenure_months" value={productForm.min_tenure_months} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Tenure (Months) *</label>
                    <input type="number" name="max_tenure_months" value={productForm.max_tenure_months} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Interest</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%) *</label>
                    <input type="number" step="0.01" name="interest_rate" value={productForm.interest_rate}
                      onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interest Type</label>
                    <select name="interest_type" value={productForm.interest_type} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="SIMPLE">Simple</option>
                      <option value="COMPOUND">Compound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Compounding Frequency</label>
                    <select name="compounding_frequency" value={productForm.compounding_frequency} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Collection Rules</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grace Period (Days)</label>
                    <input type="number" name="grace_period_days" value={productForm.grace_period_days}
                      onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Late Fee Type</label>
                    <select name="late_fee_type" value={productForm.late_fee_type} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="FLAT">Flat</option>
                      <option value="PERCENT">Percent of Instalment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Late Fee Value</label>
                    <input type="number" step="0.01" name="late_fee_value" value={productForm.late_fee_value}
                      onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lock-in Months</label>
                    <input type="number" name="lock_in_months" value={productForm.lock_in_months}
                      onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Controls</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="premature_allowed" checked={productForm.premature_allowed}
                      onChange={handleProductChange} className="w-4 h-4" />
                    Premature Closure Allowed
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="maker_checker_required" checked={productForm.maker_checker_required}
                      onChange={handleProductChange} className="w-4 h-4" />
                    Maker-Checker Required
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProductForm(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAccountForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">Open RD Account</h2>
              <button onClick={() => setShowAccountForm(false)} className="text-slate-500">✕</button>
            </div>

            <form onSubmit={saveAccount} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Search Customer (Name / Mobile) *
                </label>
                <input
                  type="text"
                  placeholder="Type at least 2 characters..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customerResults.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                    {customerResults.map((c) => (
                      <div key={c.id} onClick={() => selectCustomer(c)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0">
                        <p className="font-medium">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-slate-500">ID: {c.id} | {c.mobile_number}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                    <p className="font-medium text-emerald-800">
                      Selected: {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-xs text-emerald-600">
                      ID: {selectedCustomer.id} | {selectedCustomer.mobile_number}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RD Product *</label>
                <select name="product" value={accountForm.product} onChange={handleAccountChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Product</option>
                  {products.filter((p) => p.status === "ACTIVE").map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.interest_rate}%)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Instalment *</label>
                  <input type="number" name="monthly_instalment" value={accountForm.monthly_instalment}
                    onChange={handleAccountChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tenure (Months) *</label>
                  <input type="number" name="tenure_months" value={accountForm.tenure_months}
                    onChange={handleAccountChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                <input type="date" name="start_date" value={accountForm.start_date} onChange={handleAccountChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nominee Name</label>
                  <input name="nominee_name" value={accountForm.nominee_name} onChange={handleAccountChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Relation</label>
                  <input name="nominee_relation" value={accountForm.nominee_relation} onChange={handleAccountChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAccountForm(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={!selectedCustomer}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-xl disabled:opacity-50">
                  Open RD Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {showCollectionForm && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCollectionForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">Record Collection</h2>
              <p className="text-sm text-slate-500 mt-1">
                {selectedAccount.account_number} — {selectedAccount.customer_name}
              </p>
            </div>

            <form onSubmit={saveCollection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instalment *</label>
                <select
                  value={collectionForm.instalment}
                  onChange={(e) => {
                    const inst = selectedAccount.instalments?.find((i) => i.id === Number(e.target.value));
                    setCollectionForm((prev) => ({
                      ...prev,
                      instalment: e.target.value,
                      amount: inst ? (Number(inst.amount_due) - Number(inst.amount_paid)).toFixed(2) : "",
                    }));
                  }}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Instalment</option>
                  {selectedAccount.instalments
                    ?.filter((i) => i.status !== "PAID")
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        #{i.instalment_number} — Due {i.due_date} — {i.status} — Bal:{" "}
                        {formatCurrency(Number(i.amount_due) - Number(i.amount_paid))}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input type="number" step="0.01" value={collectionForm.amount}
                  onChange={(e) => setCollectionForm({ ...collectionForm, amount: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select value={collectionForm.payment_mode}
                  onChange={(e) => setCollectionForm({ ...collectionForm, payment_mode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Collection Date</label>
                <input type="date" value={collectionForm.collection_date}
                  onChange={(e) => setCollectionForm({ ...collectionForm, collection_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCollectionForm(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700">
                  Collect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RD;