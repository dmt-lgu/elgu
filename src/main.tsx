
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom/client';
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from './redux/store';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import './index.css'
import { Suspense, lazy } from "react";

import NotFound from "./screens/notFound";
import Loader from './components/loader/loader.tsx';
import Loader2 from './components/loader/loader2.tsx';
import ErrorBoundary from './errorGate.tsx';
import AdminGuard from './components/auth/AdminGuard.tsx';



const Login = lazy(() =>
  wait(1300).then(() => import("./screens/Auth/Login.tsx")));

const Admin= lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Admin.tsx")));
const DashboardPage= lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Dashboard/Dashboard.tsx")));
const Report = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Report/Reports.tsx")));
const Manage = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Manage/Manage.tsx")));
const ModuleManage = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Manage/ModuleManage.tsx")));
const EPaymentManage = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Manage/EPaymentManage.tsx")));
const GeneralManage = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Manage/GeneralManage.tsx")));
const PublicMain = lazy(() =>
  wait(1300).then(() => import("./screens/Public/Public.tsx")));
const AuditTrail = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/AuditTrail/AuditTrail.tsx")));

const router = createBrowserRouter([

  {
    path: "/elgu/",
    element: <Navigate to="/elgu/main" />,
  },

{
    path: "/elgu/login",
    element: 
    <Suspense fallback={<Loader />}>

      <Login />
    </Suspense>,
  },
  {
    path: "/elgu/main",
    element: 
    <Suspense fallback={<Loader />}>
      <PublicMain />
    </Suspense>,
    children: [
      {
        path: "/elgu/main", 
        element: <Navigate to="/elgu/main/dashboard" />, 
      },
      {
        path: "/elgu/main/dashboard",
        element: <>
        <Suspense fallback={<Loader2 />}>
          <DashboardPage/>
        </Suspense>
      </>,
      },
      {
        path: "/elgu/main/report",
        element: <>
        <Suspense fallback={<Loader2 />}>
          <Report />
        </Suspense>
      </>,
      },]

  },
  {
    path: "/elgu/admin",
    element: 
    <AdminGuard>
      <Suspense fallback={<Loader />}>
        <Admin/>
      </Suspense>
    </AdminGuard>
    ,
    
    children: [
      {
        path: "/elgu/admin", 
        element: <Navigate to="/elgu/admin/dashboard" />, 
      },
      {
        path: "/elgu/admin/dashboard",
        element: <>
        <Suspense fallback={<Loader2 />}>
          <DashboardPage/>
        </Suspense>
      </>,
      },
      {
        path: "/elgu/admin/report",
        element: <>
        <Suspense fallback={<Loader2 />}>
          <Report />
        </Suspense>
      </>,
      },
      {
        path: "/elgu/admin/manage",
        element: <>
          <Suspense fallback={<Loader2 />}>
            <Manage />
          </Suspense>
        </>,
        children: [
          {
            index: true,
            element: <Navigate to="bp1" />,
          },
          {
            path: "general",
            element: <>
              <Suspense fallback={<Loader2 />}>
                <GeneralManage />
              </Suspense>
            </>,
          },
          {
            path: "epayment",
            element: <>
              <Suspense fallback={<Loader2 />}>
                <EPaymentManage />
              </Suspense>
            </>,
          },
          {
            path: ":module",
            element: <>
              <Suspense fallback={<Loader2 />}>
                <ModuleManage />
              </Suspense>
            </>,
          },
        ],
      },

      {
        path: "/elgu/admin/audit-trail",
        element: <>
          <Suspense fallback={<Loader2 />}>
            <AuditTrail />
          </Suspense>
        </>,
      },

      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

function wait( time:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </Suspense>
      </PersistGate>
    </Provider>
  </ErrorBoundary>
);
