import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F4F7FC]">
      {/* Sidebar — fixed height, does not scroll with page */}
      <Sidebar />

      {/* Main content — ONLY this area scrolls on the right */}
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-16.25 md:pt-0">
        <div className="w-full p-3 sm:p-5 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;