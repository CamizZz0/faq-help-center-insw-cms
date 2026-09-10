import {
  Route,
  Routes,
} from "react-router-dom";

import CmsLayout from "./components/cms/CmsLayout";
import DashboardPage from "./pages/cms/DashboardPage";
import FaqListPage from "./pages/cms/FaqListPage";
import PlaceholderPage from "./pages/cms/PlaceholderPage";
import FaqFormPage from "./pages/cms/FaqFormPage";
import FaqEditPage from "./pages/cms/FaqEditPage";
import CategoryPage from "./pages/cms/CategoryPage";

export default function App() {
  return (
    <Routes>
      <Route element={<CmsLayout />}>
        <Route
          index
          element={<DashboardPage />}
        />

        <Route
          path="faqs"
          element={<FaqListPage />}
        />

        <Route
          path="faqs/new"
          element={<FaqFormPage />}
        />

        <Route
          path="faqs/:faqId/edit"
          element={<FaqFormPage />}
        />

        <Route
          path="categories"
          element={<CategoryPage />}
        />
      </Route>
    </Routes>
  );
}