
function App() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-2xl text-white">
          ₹
        </div>

        <h1 className="text-3xl font-bold text-slate-900">
          Microfinance System
        </h1>

        <p className="mt-2 text-slate-500">
          Tailwind CSS styling test
        </p>

        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-700">
            ✓ CSS is working!
          </p>
          <p className="mt-1 text-sm text-green-600">
            React and Tailwind CSS are connected successfully.
          </p>
        </div>

        <button
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
          onClick={() => alert("Tailwind CSS and React are working!")}
        >
          Test Button
        </button>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-indigo-50 p-4">
            <p className="text-sm text-indigo-600">Total Customers</p>
            <p className="mt-2 text-2xl font-bold text-indigo-900">250</p>
          </div>

          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-sm text-emerald-600">Active Loans</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">120</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
