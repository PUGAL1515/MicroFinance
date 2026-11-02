const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.detail ||
          Object.entries(data || {})
            .map(
              ([key, value]) =>
                `${key}: ${
                  typeof value === "object" ? JSON.stringify(value) : value
                }`,
            )
            .join("\n");

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

const json = (method, body) => ({
  method,
  body: JSON.stringify(body),
});

export const loanApi = {
  // Plans
  getPlans: () => request("/api/group-loan/plans/"),
  createPlan: (data) => request("/api/group-loan/plans/", json("POST", data)),
  updatePlan: (id, data) =>
    request(`/api/group-loan/plans/${id}/`, json("PATCH", data)),

  // Groups
  getGroups: () => request("/api/group-loan/groups/"),
  createGroup: (data) => request("/api/group-loan/groups/", json("POST", data)),
  updateGroup: (id, data) =>
    request(`/api/group-loan/groups/${id}/`, json("PATCH", data)),

  // Members and customers
  getMembers: (groupId) =>
    request(`/api/group-loan/groups/${groupId}/members/`),
  addMember: (groupId, customerId, isLeader = false) =>
    request(
      `/api/group-loan/groups/${groupId}/members/`,
      json("POST", {
        customer: Number(customerId),
        is_leader: isLeader,
      }),
    ),
  getCustomers: (query = "") =>
    request(`/api/customer/?q=${encodeURIComponent(query)}`),

  // Loan applications
  getApplications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/group-loan/applications/${query ? `?${query}` : ""}`);
  },
  createApplication: (data) =>
    request("/api/group-loan/applications/", json("POST", data)),

  // Approval / rejection
  decideApplication: (id, data) =>
    request(
      `/api/group-loan/applications/${id}/decision/`,
      json("PATCH", data),
    ),

  // Calculation and EMI schedule
  generateSchedule: (id, firstDueDate) =>
    request(
      `/api/group-loan/applications/${id}/generate-schedule/`,
      json("POST", {
        ...(firstDueDate ? { first_due_date: firstDueDate } : {}),
      }),
    ),

  // Disbursement
  disburseLoan: (id) =>
    request(`/api/group-loan/applications/${id}/disburse/`, json("POST", {})),
  //   disburseLoan: (applicationId) =>
  // api.post(
  //   `/api/group-loan/applications/${applicationId}/disburse/`,
  //   {}
  // ),

  // Collection
  recordPayment: (installmentId, data) =>
    request(
      `/api/group-loan/installments/${installmentId}/payments/`,
      json("POST", data),
    ),
};
