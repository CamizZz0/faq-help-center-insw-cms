import {
  Route,
  Routes,
} from "react-router-dom";

import CmsLayout from "./components/cms/CmsLayout";
import DashboardPage from "./pages/cms/DashboardPage";
import FaqListPage from "./pages/cms/FaqListPage";
import FaqFormPage from "./pages/cms/FaqFormPage";
import CategoryPage from "./pages/cms/CategoryPage";
import SubcategoryListPage from "./pages/cms/SubcategoryListPage";
import SubcategoryFormPage from "./pages/cms/SubcategoryFormPage";
import TopicListPage from "./pages/cms/TopicListPage";
import TopicFormPage from "./pages/cms/TopicFormPage";
import GuideListPage from "./pages/cms/GuideListPage";
import GuideFormPage from "./pages/cms/GuideFormPage";
import TutorialListPage from "./pages/cms/TutorialListPage";
import TutorialFormPage from "./pages/cms/TutorialFormPage";

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
          element={<SubcategoryListPage />}
        />

        <Route
          path="subcategories/new"
          element={<SubcategoryFormPage />}
        />

        <Route
          path="subcategories/:subcategoryId/edit"
          element={<SubcategoryFormPage />}
        />

        <Route
          path="topics"
          element={<TopicListPage />}
        />

        <Route
          path="topics/new"
          element={<TopicFormPage />}
        />

        <Route
          path="topics/:topicId/edit"
          element={<TopicFormPage />}
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
          element={<TutorialListPage />}
        />
        <Route path="tutorials/new" element={<TutorialFormPage />} />
        <Route path="tutorials/:tutorialId/edit" element={<TutorialFormPage />} />
      </Route>
    </Routes>
  );
}
