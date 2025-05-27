import React from 'react'
import ReactDOM from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import './index.css'
import { Suspense, lazy } from "react";

import NotFound from "./screens/notFound";
import Loader from './components/loader/loader.tsx';
import Loader2 from './components/loader/loader2.tsx';




const Login = lazy(() =>
  wait(1300).then(() => import("./screens/Auth/Login.tsx")));

const Admin= lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Admin.tsx")));
const DashboardPage= lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Dashboard/Dashboard.tsx")));
const Report = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Report/Report.tsx")));

const Page2= lazy(() =>
  wait(1300).then(() => import("./screens/page2.tsx"))
);

const router = createBrowserRouter([

  {
    path: "/react-vite-supreme/",
    element: <Navigate to="/react-vite-supreme/login" />,
  }
,

{
    path: "/react-vite-supreme/login",
    element: 
    <Suspense fallback={<Loader />}>

      <Login />
    </Suspense>,
  },

  {
    path: "/react-vite-supreme/admin",
    element: 
    <Suspense fallback={<Loader />}>
      <Admin/>
    </Suspense>
    ,
    
    children: [
      {
        path: "/react-vite-supreme/admin", 
        element: <Navigate to="/react-vite-supreme/admin/dashboard" />, 
      },
      {
        path: "/react-vite-supreme/admin/dashboard",
        element: <>
        <Suspense fallback={<Loader2 />}>
          <DashboardPage/>
        </Suspense>
      </>,
      },
      {
        path: "/react-vite-supreme/admin/report",
        element: <>
        <Suspense fallback={<Loader2 />}>
          <Report />
        </Suspense>
      </>,
      },



      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

function wait( time:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
