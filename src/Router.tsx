import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import {Graph} from "@/pages/admin/graph";
import {Graph3} from "@/pages/admin/graph3";
import {GraphV2} from "@/pages/admin/graphv2";
import {Prohibition} from "@/pages/admin/prohibition";
import { Login } from "@/pages/Login";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PML } from './pages/admin/pml';
import { Execute } from './pages/admin/execute';
import { DAG } from './pages/admin/dag';
import ObligationsPage from './pages/admin/obligations';

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
        path: 'graph3',
        element: <Graph3 />,
      },
      {
        path: 'graphv2',
        element: <GraphV2 />,
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
        path: 'obligations',
        element: <ObligationsPage />,
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
