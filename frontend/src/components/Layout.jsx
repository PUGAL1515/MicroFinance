import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#F4F7FC]">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className="
          min-h-screen
          min-w-0
          flex-1
          overflow-x-hidden
          pt-[65px]
          md:pt-0
        "
      >
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