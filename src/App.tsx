import { createBrowserRouter, RouterProvider, Outlet, Link } from "react-router-dom";
import Home from "./pages/Home";
import OrderForm from "./pages/OrderForm";
import TrackProgress from "./pages/TrackProgress";
import AdminDashboard from "./pages/AdminDashboard";
import { Palette, Home as HomeIcon } from "lucide-react";

// Navbar layout
function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-powder-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-powder-300 p-2 rounded-xl group-hover:bg-powder-400">
              <Palette size={20} className="text-white" />
            </div>
            <span className="font-medium text-lg text-slate-700">Mevis委託繪製小站</span>
          </Link>
          <Link to="/" className="text-slate-500 hover:text-powder-600 flex items-center gap-1 text-sm font-medium">
            <HomeIcon size={16} /> 回首頁
          </Link>
        </div>
      </nav>
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      <footer className="mt-auto py-8 text-center text-sm text-slate-400 border-t border-powder-100">
        © {new Date().getFullYear()} Art Commissions. All rights reserved. 
        <Link to="/admin" className="ml-4 hover:text-powder-500 underline opacity-30 hover:opacity-100">管理員登入</Link>
      </footer>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "order", element: <OrderForm /> },
      { path: "track", element: <TrackProgress /> },
      { path: "admin", element: <AdminDashboard /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
