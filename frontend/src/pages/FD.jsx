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
    // Both Super Admin and RD/FD Admin need products
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
    customer_name: "",
    customer_phone: "",
    customer_id_proof: "",
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
      } else {
        await api.post("fd/products/", payload);
      }
      setShowProductForm(false);
      fetchProducts();
    } catch (err) {
      const msg =
        err.response?.data?.code?.[0] ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Failed to save product";
      alert(msg);
    }
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post("fd/accounts/", {
        ...accountForm,
        product: Number(accountForm.product),
        deposit_amount: Number(accountForm.deposit_amount),
        tenure_value: Number(accountForm.tenure_value),
      });
      setShowAccountForm(false);
      setAccountForm({
        product: "",
        customer_name: "",
        customer_phone: "",
        customer_id_proof: "",
        deposit_amount: "",
        tenure_value: "",
        start_date: new Date().toISOString().split("T")[0],
        maturity_instruction: "PAY_PRINCIPAL_INTEREST",
        nominee_name: "",
        nominee_relation: "",
      });
      fetchAccounts();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Failed to create FD account";
      alert(msg);
    }
  };

  const approveAccount = async (id) => {
    if (!window.confirm("Approve this FD account?")) return;
    try {
      await api.post(`fd/accounts/${id}/approve/`);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || "Approval failed");
    }
  };

  const prematureClose = async (id) => {
    if (!window.confirm("Close this FD prematurely?")) return;
    try {
      const res = await api.post(`fd/accounts/${id}/premature-close/`);
      alert(`Closed. Payout: ₹${res.data.payout_amount}`);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to close");
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
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || "bg-slate-100"}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Fixed Deposit</h1>
          <p className="text-slate-500 mt-1">
            {isSuperAdmin ? "Manage FD Products & Accounts" : "Open and manage FD Accounts"}
          </p>
        </div>

        <div className="flex gap-3">
          {isSuperAdmin && (
            <button
              onClick={() => openProductForm()}
              className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
            >
              + New Product
            </button>
          )}
          {isRDAdmin && (
            <button
              onClick={() => setShowAccountForm(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition"
            >
              + Open FD Account
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("products")}
            className={`px-5 py-2.5 font-medium text-sm rounded-t-lg transition ${
              activeTab === "products"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            FD Products
          </button>
        )}
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-5 py-2.5 font-medium text-sm rounded-t-lg transition ${
            activeTab === "accounts"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          FD Accounts
        </button>
      </div>

      {/* ==================== PRODUCTS TAB ==================== */}
      {activeTab === "products" && isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Scheme</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Tenure</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Amount Range</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      No FD products found
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{p.name}</td>
                      <td className="px-5 py-4 text-slate-600">{p.code}</td>
                      <td className="px-5 py-4 text-slate-800">{p.interest_rate}%</td>
                      <td className="px-5 py-4 text-slate-600">
                        {p.min_tenure} - {p.max_tenure} {p.tenure_unit?.toLowerCase()}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatCurrency(p.min_amount)} - {formatCurrency(p.max_amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openProductForm(p)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Account No</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Product</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Deposit</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Maturity</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      No FD accounts found
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{acc.account_number}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{acc.customer_name}</p>
                        <p className="text-xs text-slate-400">{acc.customer_phone}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{acc.product_name}</td>
                      <td className="px-5 py-4 font-medium">{formatCurrency(acc.deposit_amount)}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{formatCurrency(acc.maturity_amount)}</p>
                        <p className="text-xs text-slate-400">{acc.maturity_date}</p>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(acc.status)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
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
                              onClick={() => prematureClose(acc.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
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

      {/* ==================== PRODUCT FORM MODAL ==================== */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProductForm(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">
                {editingProduct ? "Edit FD Product" : "New FD Product"}
              </h2>
              <button onClick={() => setShowProductForm(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={saveProduct} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Basic Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Name *</label>
                    <input name="name" value={productForm.name} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Code *</label>
                    <input name="code" value={productForm.code} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea name="description" value={productForm.description} onChange={handleProductChange} rows={2}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select name="status" value={productForm.status} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Effective From *</label>
                    <input type="date" name="effective_from" value={productForm.effective_from} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Interest */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Interest Options</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%) *</label>
                    <input type="number" step="0.01" name="interest_rate" value={productForm.interest_rate}
                      onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interest Type</label>
                    <select name="interest_type" value={productForm.interest_type} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="SIMPLE">Simple</option>
                      <option value="COMPOUND">Compound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Compounding</label>
                    <select name="compounding_frequency" value={productForm.compounding_frequency} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="HALF_YEARLY">Half Yearly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payout</label>
                    <select name="payout_frequency" value={productForm.payout_frequency} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="AT_MATURITY">At Maturity</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tenure & Amount */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Tenure & Amount</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount *</label>
                    <input type="number" name="min_amount" value={productForm.min_amount} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount *</label>
                    <input type="number" name="max_amount" value={productForm.max_amount} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tenure Unit</label>
                    <select name="tenure_unit" value={productForm.tenure_unit} onChange={handleProductChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="DAYS">Days</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Tenure *</label>
                    <input type="number" name="min_tenure" value={productForm.min_tenure} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Tenure *</label>
                    <input type="number" name="max_tenure" value={productForm.max_tenure} onChange={handleProductChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Controls</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="premature_allowed" checked={productForm.premature_allowed}
                      onChange={handleProductChange} className="w-4 h-4" />
                    <label className="text-sm text-slate-700">Premature Closure Allowed</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="maker_checker_required" checked={productForm.maker_checker_required}
                      onChange={handleProductChange} className="w-4 h-4" />
                    <label className="text-sm text-slate-700">Maker-Checker Required</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="nominee_required" checked={productForm.nominee_required}
                      onChange={handleProductChange} className="w-4 h-4" />
                    <label className="text-sm text-slate-700">Nominee Required</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="tds_applicable" checked={productForm.tds_applicable}
                      onChange={handleProductChange} className="w-4 h-4" />
                    <label className="text-sm text-slate-700">TDS Applicable</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="is_senior_citizen" checked={productForm.is_senior_citizen}
                      onChange={handleProductChange} className="w-4 h-4" />
                    <label className="text-sm text-slate-700">Senior Citizen Scheme</label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProductForm(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-medium rounded-xl">
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAccountForm(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">Open FD Account</h2>
              <button onClick={() => setShowAccountForm(false)} className="text-slate-500">✕</button>
            </div>

            <form onSubmit={saveAccount} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">FD Product *</label>
                <select name="product" value={accountForm.product} onChange={handleAccountChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                <input name="customer_name" value={accountForm.customer_name} onChange={handleAccountChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input name="customer_phone" value={accountForm.customer_phone} onChange={handleAccountChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID Proof</label>
                  <input name="customer_id_proof" value={accountForm.customer_id_proof} onChange={handleAccountChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deposit Amount *</label>
                  <input type="number" name="deposit_amount" value={accountForm.deposit_amount} onChange={handleAccountChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tenure *</label>
                  <input type="number" name="tenure_value" value={accountForm.tenure_value} onChange={handleAccountChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                <input type="date" name="start_date" value={accountForm.start_date} onChange={handleAccountChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nominee Name</label>
                  <input name="nominee_name" value={accountForm.nominee_name} onChange={handleAccountChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Relation</label>
                  <input name="nominee_relation" value={accountForm.nominee_relation} onChange={handleAccountChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAccountForm(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-medium rounded-xl">
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