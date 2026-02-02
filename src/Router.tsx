import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Login } from "@/pages/login/Login";
import { ProtectedRoute } from "@/ProtectedRoute";
import {DashboardPage} from "@/pages/dashboard/DashboardPage";
import {TestPage} from "@/pages/test/TestPage";

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/test',
    element: <TestPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
