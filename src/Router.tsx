import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import {Graph} from "@/pages/admin/graph";
import {Prohibition} from "@/pages/admin/prohibition";
import { Login } from "@/pages/Login";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PML } from './pages/admin/pml';
import { Execute } from './pages/admin/execute';
import { DAG } from './pages/admin/dag';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <Navigate to="/graph" replace />,
      },
      {
        path: 'graph',
        element: <Graph />,
      },
      {
        path: 'dag',
        element: <DAG />,
      },
      {
        path: 'prohibitions',
        element: <Prohibition />,
      },
      {
        path: 'pml',
        element: <PML />,
      },
      {
        path: 'execute',
        element: <Execute />,
      },
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
