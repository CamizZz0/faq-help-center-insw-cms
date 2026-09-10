import {
  Route,
  Routes,
} from "react-router-dom";

import CmsLayout from "./components/cms/CmsLayout";
import DashboardPage from "./pages/cms/DashboardPage";
import FaqListPage from "./pages/cms/FaqListPage";
import PlaceholderPage from "./pages/cms/PlaceholderPage";
import FaqFormPage from "./pages/cms/FaqFormPage";
import CategoryPage from "./pages/cms/CategoryPage";
import GuideListPage from "./pages/cms/GuideListPage";
import GuideFormPage from "./pages/cms/GuideFormPage";

export default function App() {
  return (
    <Routes>
      <Route element={<CmsLayout />}>
        <Route
          index
          element={<DashboardPage />}
        />

        <Route
          path="categories"
          element={<CategoryPage />}
        />

        <Route
          path="subcategories"
          element={<PlaceholderPage title="Kelola Subkategori" />}
        />

        <Route
          path="topics"
          element={<PlaceholderPage title="Kelola Topik" />}
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
          path="guides"
          element={<GuideListPage />}
        />

        <Route path="guides/new" element={<GuideFormPage />} />
        <Route path="guides/:guideId/edit" element={<GuideFormPage />} />

        <Route
          path="tutorials"
          element={<PlaceholderPage title="Kelola Tutorial" />}
        />
      </Route>
    </Routes>
  );
}
