import React, { useState } from 'react';
import { ClientLandingPage } from './ClientLandingPage';
import { ClientHome } from './ClientHome';
import { HomeworkDashboard } from './HomeworkDashboard';
import { ModuleDetail } from './ModuleDetail';
import { ToolsDashboard } from './ToolsDashboard';
import { LibraryPage } from './LibraryPage';
import { ClientPortalLayout } from './ClientPortalLayout';
import { IntegrativeAnalysisPage } from './IntegrativeAnalysisPage';
import { JournalPage } from './JournalPage';
import { ClientPortalProviderWrapper } from '../../contexts/ClientPortalContext';
import { ProgressPage } from './ProgressPage';

type ClientView =
  | 'landing'
  | 'home'
  | 'homework'
  | 'module'
  | 'tools'
  | 'library'
  | 'integrativeAnalysis'
  | 'journal'
  | 'progress';

export const ClientApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<ClientView>('landing');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<
    Array<{ view: ClientView; moduleId?: string | null }>
  >([]);

  const pushToHistory = () => {
    setNavigationHistory((prev) => [
      ...prev,
      { view: currentView, moduleId: selectedModuleId },
    ]);
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((h) => h.slice(0, -1));
      setCurrentView(prev.view);
      setSelectedModuleId(prev.moduleId || null);
    } else {
      setCurrentView('landing');
    }
  };

  const navigateTo = (view: ClientView) => {
    pushToHistory();
    setCurrentView(view);
  };

  const handleNavigateToModule = (moduleId: string) => {
    pushToHistory();
    setSelectedModuleId(moduleId);
    setCurrentView('module');
  };

  if (currentView === 'landing') {
    return <ClientLandingPage onNavigateToDashboard={() => navigateTo('home')} />;
  }

  if (currentView === 'home') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout>
          <ClientHome
            onNavigateToHomework={() => navigateTo('homework')}
            onNavigateToTools={() => navigateTo('tools')}
            onNavigateToModule={handleNavigateToModule}
            onNavigateToLibrary={() => navigateTo('library')}
            onNavigateToIntegrativeAnalysis={() => navigateTo('integrativeAnalysis')}
            onNavigateToJournal={() => navigateTo('journal')}
            onNavigateToProgress={() => navigateTo('progress')}
          />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'homework') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout>
          <HomeworkDashboard onNavigateToModule={handleNavigateToModule} onNavigateBack={handleGoBack} />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'module' && selectedModuleId) {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout contextModuleId={selectedModuleId}>
          <ModuleDetail
            moduleId={selectedModuleId}
            onNavigateBack={handleGoBack}
            onNavigateToTools={() => navigateTo('tools')}
          />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'tools') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout>
          <ToolsDashboard onNavigateBack={handleGoBack} />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'library') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout>
          <LibraryPage onNavigateToModule={handleNavigateToModule} onNavigateBack={handleGoBack} />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'integrativeAnalysis') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout>
          <IntegrativeAnalysisPage onNavigateBack={handleGoBack} />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'journal') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout>
          <JournalPage onNavigateBack={handleGoBack} />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  if (currentView === 'progress') {
    return (
      <ClientPortalProviderWrapper>
        <ClientPortalLayout showJournalPanel={false}>
          <ProgressPage onNavigateBack={handleGoBack} />
        </ClientPortalLayout>
      </ClientPortalProviderWrapper>
    );
  }

  return null;
};
