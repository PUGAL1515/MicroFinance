
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const getToken = () =>
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("authToken");

async function request(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/api/collection/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.detail ||
      data.message ||
      Object.values(data).flat().join(" ") ||
      "Something went wrong";

    throw new Error(message);
  }

  return data;
}

const collectionApi = {
  dashboard: () => request("dashboard/"),

  todayDues: () => request("today-dues/"),

  collectPayment: (payload) =>
    request("field-collection/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  paymentHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`payments/${query ? `?${query}` : ""}`);
  },

  overdue: () => request("overdue/"),

  followUps: () => request("follow-ups/"),

  createFollowUp: (payload) =>
    request("follow-ups/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  receipt: (id) => request(`receipts/${id}/`),
};

export default collectionApi;
