
import { useCallback, useEffect, useState } from "react";

import CollectionHeader from "../components/CollectionHeader";
import CollectionStats from "../components/CollectionStats";
import CollectionTabs from "../components/CollectionTabs";
import TodayDues from "../components/TodayDues";
import PaymentModal from "../components/PaymentModal";
import PaymentHistory from "../components/PaymentHistory";
import OverdueList from "../components/OverdueList";
import FollowUpForm from "../components/FollowUpForm";
import ReceiptModal from "../components/ReceiptModal";

import collectionApi from "../../services/collectionApi";

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const CollectionsPage = () => {
  const [activeTab, setActiveTab] = useState("dues");

  const [dashboard, setDashboard] = useState({});
  const [dues, setDues] = useState([]);
  const [payments, setPayments] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [followUps, setFollowUps] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        dashboardData,
        duesData,
        paymentData,
        overdueData,
        followUpData,
      ] = await Promise.all([
        collectionApi.dashboard(),
        collectionApi.todayDues(),
        collectionApi.paymentHistory(),
        collectionApi.overdue(),
        collectionApi.followUps(),
      ]);

      setDashboard(dashboardData);
      setDues(getList(duesData));
      setPayments(getList(paymentData));
      setOverdue(getList(overdueData));
      setFollowUps(getList(followUpData));
    } catch (err) {
      setError(err.message || "Unable to load collection data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCollection = async (payload) => {
    setPaymentLoading(true);

    try {
      const response = await collectionApi.collectPayment(payload);

      setSelectedItem(null);
      setSelectedReceipt(response);

      await loadData();
    } catch (err) {
      alert(err.message || "Payment collection failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFollowUp = async (payload) => {
    setFollowUpLoading(true);

    try {
      await collectionApi.createFollowUp(payload);
      alert("Follow-up saved successfully.");

      setActiveTab("followups");
      await loadData();
    } catch (err) {
      alert(err.message || "Unable to save follow-up.");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const openFollowUp = (item) => {
    setActiveTab("followups");

    // Preselect the installment when opening follow-up from overdue.
    setSelectedItem(item);
  };

  return (
    <div className="collection-page min-h-screen bg-[#f5f8ff] px-4 pb-8 pt-20 sm:px-6 md:pt-8 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <CollectionHeader
          onRefresh={loadData}
          loading={loading}
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <CollectionStats data={dashboard} />

        <CollectionTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSelectedItem(null);
            setActiveTab(tab);
          }}
        />

        {loading ? (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-100 bg-white">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
              <p className="mt-4 text-sm font-medium text-slate-500">
                Loading collections...
              </p>
            </div>
          </div>
        ) : (
          <div className="collection-content-enter">
            {activeTab === "dues" && (
              <TodayDues
                dues={dues}
                onCollect={setSelectedItem}
              />
            )}

            {activeTab === "history" && (
              <PaymentHistory
                payments={payments}
                onViewReceipt={setSelectedReceipt}
              />
            )}

            {activeTab === "overdue" && (
              <OverdueList
                items={overdue}
                onFollowUp={openFollowUp}
              />
            )}

            {activeTab === "followups" && (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <FollowUpForm
                  items={overdue.length ? overdue : dues}
                  onSubmit={handleFollowUp}
                  loading={followUpLoading}
                />

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="font-bold text-slate-900">
                    Recent Follow-ups
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Customer follow-up activity
                  </p>

                  <div className="mt-5 space-y-3">
                    {followUps.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">
                        No follow-ups recorded yet.
                      </p>
                    ) : (
                      followUps.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-100 p-4 transition hover:bg-blue-50/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-800">
                              {item.customer_name || "Customer"}
                            </p>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                              {item.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            {item.remarks || "No remarks"}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            Follow-up: {item.follow_up_date}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <PaymentModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSubmit={handleCollection}
          loading={paymentLoading}
        />
      )}

      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default CollectionsPage;
