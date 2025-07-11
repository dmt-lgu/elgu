
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



const Login = lazy(() =>
  wait(1300).then(() => import("./screens/Auth/Login.tsx")));

const Admin= lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Admin.tsx")));
const DashboardPage= lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Dashboard/Dashboard.tsx")));
const Report = lazy(() =>
  wait(1300).then(() => import("./screens/Admin/Report/Reports.tsx")));


const router = createBrowserRouter([

  {
    path: "/elgu/",
    element: <Navigate to="/elgu/login" />,
  }
,

{
    path: "/elgu/login",
    element: 
    <Suspense fallback={<Loader />}>

      <Login />
    </Suspense>,
  },

  {
    path: "/elgu/admin",
    element: 
    <Suspense fallback={<Loader />}>
      <Admin/>
    </Suspense>
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
