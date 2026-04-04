import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Home from "./pages/Home.tsx";
import { NewListing } from "./pages/NewListing.tsx";
import { AuthProvider } from "./providers/AuthProvider.tsx";
import { NDKProvider } from "./providers/NDKProvider.tsx";
import { Profile } from "./pages/Profile.tsx";
import { ListingDetail } from "./pages/ListingDetail.tsx";
import { SellerProfile } from "./pages/SellerProfile.tsx";
import App from "./App.tsx";

import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/new",
        element: <NewListing />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/listing/:id",
        element: <ListingDetail />,
      },
      {
        path: "/seller/:pubkey",
        element: <SellerProfile />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NDKProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </NDKProvider>
  </StrictMode>,
);
